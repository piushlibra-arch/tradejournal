import uuid
from decimal import Decimal
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics.engine import AnalyticsEngine
from app.models.trade import Trade


class TradingAssistantService:
    @staticmethod
    async def analyze_trader_performance(
        db: AsyncSession,
        user_id: uuid.UUID,
        user_query: Optional[str] = None,
    ) -> Dict[str, Any]:
        # Fetch all user trades
        stmt = select(Trade).where(Trade.user_id == user_id).order_by(Trade.entry_time.asc())
        res = await db.execute(stmt)
        trades = list(res.scalars().all())

        if not trades:
            return {
                "summary": "No historical trades found in your journal yet.",
                "insights": [
                    "Import broker executions or log trades to generate empirical AI diagnostics.",
                    "Tip: A minimum of 30 trades is recommended for statistical significance.",
                ],
                "metrics": {
                    "total_trades": 0,
                    "net_pnl": 0.0,
                    "win_rate": 0.0,
                    "profit_factor": 0.0,
                },
                "disclaimer": "Grounding notice: Correlation does not imply causation. All findings are derived strictly from your recorded executions.",
            }

        kpis = AnalyticsEngine.calculate_kpis(trades)

        # Mistake analysis
        mistake_counts: Dict[str, int] = {}
        mistake_loss_dollars: Dict[str, Decimal] = {}
        for t in trades:
            if t.mistake_classification:
                m = t.mistake_classification.strip()
                mistake_counts[m] = mistake_counts.get(m, 0) + 1
                if t.net_pnl is not None and t.net_pnl < Decimal("0"):
                    mistake_loss_dollars[m] = mistake_loss_dollars.get(m, Decimal("0")) + abs(t.net_pnl)

        # Instrument breakdown
        symbol_pnl: Dict[str, Decimal] = {}
        for t in trades:
            if t.symbol and t.net_pnl is not None:
                symbol_pnl[t.symbol] = symbol_pnl.get(t.symbol, Decimal("0")) + t.net_pnl

        best_symbol = max(symbol_pnl.items(), key=lambda x: x[1]) if symbol_pnl else ("N/A", Decimal("0"))
        worst_symbol = min(symbol_pnl.items(), key=lambda x: x[1]) if symbol_pnl else ("N/A", Decimal("0"))

        # Time-of-day / session analysis
        hourly_pnl: Dict[int, Decimal] = {}
        for t in trades:
            if t.entry_time and t.net_pnl is not None:
                hour = t.entry_time.hour
                hourly_pnl[hour] = hourly_pnl.get(hour, Decimal("0")) + t.net_pnl

        # Generate data-grounded insights
        insights: List[str] = []

        # Win Rate & Profit Factor check
        pf = float(kpis["profit_factor"]) if kpis["profit_factor"] is not None else 0.0
        win_rate = kpis["win_rate"]
        net_realized_pnl = Decimal(str(kpis["net_realized_pnl"]))
        max_drawdown = Decimal(str(kpis["max_drawdown_amount"]))
        avg_loss = Decimal(str(kpis["average_loss"]))

        if pf >= 2.0:
            insights.append(f"Strong mechanical edge: Profit Factor is {pf:.2f} with a {win_rate:.1f}% win rate.")
        elif pf >= 1.2:
            insights.append(f"Moderate positive edge: Profit Factor is {pf:.2f}. Focus on trimming average losing trades.")
        else:
            insights.append(f"Negative or marginal edge: Profit Factor is {pf:.2f}. Average loss of ${avg_loss:,.2f} exceeds profit efficiency.")

        # Biggest instrument leak vs winner
        if best_symbol[1] > Decimal("0"):
            insights.append(f"Top performing asset: {best_symbol[0]} generated +${best_symbol[1]:,.2f} in cumulative net P&L.")
        if worst_symbol[1] < Decimal("0"):
            insights.append(f"Primary capital leak: {worst_symbol[0]} produced -${abs(worst_symbol[1]):,.2f} in losses.")

        # Behavioral mistakes
        if mistake_loss_dollars:
            top_mistake = max(mistake_loss_dollars.items(), key=lambda x: x[1])
            insights.append(
                f"Costliest behavioral leak: '{top_mistake[0]}' accounted for -${top_mistake[1]:,.2f} in avoidable losses across {mistake_counts.get(top_mistake[0], 0)} trades."
            )
        else:
            insights.append("Discipline tag: No classified trading mistakes recorded. Continue tagging mistakes to identify psychological leaks.")

        # Query-specific responses if user requested specific prompt
        query_text = (user_query or "").lower()
        if "mistake" in query_text:
            focused_answer = f"Your recorded mistakes caused ${sum(mistake_loss_dollars.values(), Decimal('0')):,.2f} in realized drawdowns."
        elif "symbol" in query_text or "instrument" in query_text:
            focused_answer = f"Your highest expectancy instrument is {best_symbol[0]} (+${best_symbol[1]:,.2f})."
        elif "risk" in query_text or "drawdown" in query_text:
            focused_answer = f"Maximum peak-to-trough drawdown reached ${max_drawdown:,.2f} ({kpis['max_drawdown_percent']:.2f}%)."
        else:
            focused_answer = f"Overall performance summary: {kpis['total_trades']} trades executed with ${net_realized_pnl:,.2f} net realized P&L."

        return {
            "summary": focused_answer,
            "insights": insights,
            "metrics": {
                "total_trades": kpis["total_trades"],
                "net_pnl": float(net_realized_pnl),
                "win_rate": kpis["win_rate"],
                "profit_factor": pf,
                "max_drawdown": float(max_drawdown),
                "avg_win": float(kpis["average_win"]),
                "avg_loss": float(avg_loss),
                "expectancy": float(kpis["expectancy"]),
            },
            "disclaimer": "Grounding notice: Correlation does not imply causation. All findings are derived strictly from your recorded executions.",
        }
