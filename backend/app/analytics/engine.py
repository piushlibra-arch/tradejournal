from decimal import Decimal
from typing import Any, Dict, List

from app.models.trade import Trade


class AnalyticsEngine:
    """Independent financial analytics calculation engine with zero floating-point loss."""

    @staticmethod
    def calculate_kpis(trades: List[Trade], initial_balance: Decimal = Decimal("0")) -> Dict[str, Any]:
        closed = [t for t in trades if t.status == "closed" and t.net_pnl is not None]
        total_trades = len(closed)

        if total_trades == 0:
            return {
                "total_trades": 0,
                "net_realized_pnl": "0.00",
                "gross_realized_pnl": "0.00",
                "total_commission": "0.00",
                "total_fees": "0.00",
                "win_rate": 0.0,
                "winning_trades": 0,
                "losing_trades": 0,
                "breakeven_trades": 0,
                "profit_factor": None,
                "average_win": "0.00",
                "average_loss": "0.00",
                "win_loss_ratio": None,
                "expectancy": "0.00",
                "max_drawdown_amount": "0.00",
                "max_drawdown_percent": 0.0,
                "average_r_multiple": None,
                "best_trade": "0.00",
                "worst_trade": "0.00",
                "current_equity": str(initial_balance),
            }

        net_pnl = sum((t.net_pnl for t in closed), Decimal("0"))
        gross_pnl = sum((t.gross_pnl for t in closed if t.gross_pnl is not None), Decimal("0"))
        commissions = sum((t.commission for t in closed), Decimal("0"))
        fees = sum((t.fees for t in closed), Decimal("0"))

        wins = [t for t in closed if t.net_pnl > Decimal("0")]
        losses = [t for t in closed if t.net_pnl < Decimal("0")]
        breakeven = [t for t in closed if t.net_pnl == Decimal("0")]

        # Breakeven trades explicitly excluded from win-rate denominator
        decisive_trades = len(wins) + len(losses)
        win_rate = round((len(wins) / decisive_trades) * 100, 2) if decisive_trades > 0 else 0.0

        total_gross_wins = sum((t.gross_pnl for t in wins if t.gross_pnl is not None), Decimal("0"))
        total_gross_losses = abs(sum((t.gross_pnl for t in losses if t.gross_pnl is not None), Decimal("0")))

        if total_gross_losses > Decimal("0"):
            profit_factor = round(float(total_gross_wins / total_gross_losses), 3)
        else:
            profit_factor = None if total_gross_wins == Decimal("0") else 999.99

        avg_win = round(total_gross_wins / Decimal(len(wins)), 2) if wins else Decimal("0")
        avg_loss = round(total_gross_losses / Decimal(len(losses)), 2) if losses else Decimal("0")
        win_loss_ratio = round(float(avg_win / avg_loss), 2) if avg_loss > Decimal("0") else None

        expectancy = round(net_pnl / Decimal(total_trades), 2)

        # Chronological sort for drawdown and equity curve
        sorted_trades = sorted(closed, key=lambda t: t.entry_time)

        peak_equity = initial_balance
        running_equity = initial_balance
        max_dd_amount = Decimal("0")
        max_dd_pct = 0.0

        for t in sorted_trades:
            running_equity += t.net_pnl
            if running_equity > peak_equity:
                peak_equity = running_equity
            dd = peak_equity - running_equity
            if dd > max_dd_amount:
                max_dd_amount = dd
                if peak_equity > Decimal("0"):
                    max_dd_pct = round(float((max_dd_amount / peak_equity) * 100), 2)

        # R-Multiples
        r_multiples: List[Decimal] = []
        for t in closed:
            if t.stop_loss_price is not None and t.exit_price is not None:
                if t.direction == "long":
                    risk = t.entry_price - t.stop_loss_price
                    if risk > Decimal("0"):
                        r_multiples.append((t.exit_price - t.entry_price) / risk)
                else:
                    risk = t.stop_loss_price - t.entry_price
                    if risk > Decimal("0"):
                        r_multiples.append((t.entry_price - t.exit_price) / risk)

        avg_r = round(float(sum(r_multiples) / len(r_multiples)), 2) if r_multiples else None

        best_trade = max((t.net_pnl for t in closed), default=Decimal("0"))
        worst_trade = min((t.net_pnl for t in closed), default=Decimal("0"))

        return {
            "total_trades": total_trades,
            "net_realized_pnl": str(net_pnl),
            "gross_realized_pnl": str(gross_pnl),
            "total_commission": str(commissions),
            "total_fees": str(fees),
            "win_rate": win_rate,
            "winning_trades": len(wins),
            "losing_trades": len(losses),
            "breakeven_trades": len(breakeven),
            "profit_factor": profit_factor,
            "average_win": str(avg_win),
            "average_loss": str(avg_loss),
            "win_loss_ratio": win_loss_ratio,
            "expectancy": str(expectancy),
            "max_drawdown_amount": str(max_dd_amount),
            "max_drawdown_percent": max_dd_pct,
            "average_r_multiple": avg_r,
            "best_trade": str(best_trade),
            "worst_trade": str(worst_trade),
            "current_equity": str(initial_balance + net_pnl),
        }

    @staticmethod
    def calculate_equity_curve(trades: List[Trade], initial_balance: Decimal = Decimal("0")) -> List[Dict[str, Any]]:
        closed = [t for t in trades if t.status == "closed" and t.net_pnl is not None]
        sorted_trades = sorted(closed, key=lambda t: t.entry_time)

        curve: List[Dict[str, Any]] = [
            {
                "timestamp": sorted_trades[0].entry_time.isoformat() if sorted_trades else "start",
                "trade_pnl": "0.00",
                "cumulative_pnl": "0.00",
                "equity": str(initial_balance),
                "drawdown": "0.00",
            }
        ]

        cumulative_pnl = Decimal("0")
        running_equity = initial_balance
        peak_equity = initial_balance

        for t in sorted_trades:
            cumulative_pnl += t.net_pnl
            running_equity += t.net_pnl
            if running_equity > peak_equity:
                peak_equity = running_equity
            dd = peak_equity - running_equity

            curve.append(
                {
                    "trade_id": str(t.id),
                    "symbol": t.symbol,
                    "timestamp": t.exit_time.isoformat() if t.exit_time else t.entry_time.isoformat(),
                    "trade_pnl": str(t.net_pnl),
                    "cumulative_pnl": str(cumulative_pnl),
                    "equity": str(running_equity),
                    "drawdown": str(dd),
                }
            )

        return curve

    @staticmethod
    def calculate_daily_pnl(trades: List[Trade]) -> List[Dict[str, Any]]:
        closed = [t for t in trades if t.status == "closed" and t.net_pnl is not None]
        days: Dict[str, Dict[str, Any]] = {}

        for t in closed:
            date_str = t.entry_time.strftime("%Y-%m-%d")
            if date_str not in days:
                days[date_str] = {
                    "date": date_str,
                    "net_pnl": Decimal("0"),
                    "gross_pnl": Decimal("0"),
                    "trades_count": 0,
                    "wins": 0,
                    "losses": 0,
                }
            days[date_str]["net_pnl"] += t.net_pnl
            if t.gross_pnl:
                days[date_str]["gross_pnl"] += t.gross_pnl
            days[date_str]["trades_count"] += 1
            if t.net_pnl > Decimal("0"):
                days[date_str]["wins"] += 1
            elif t.net_pnl < Decimal("0"):
                days[date_str]["losses"] += 1

        result = []
        for d in sorted(days.keys()):
            item = days[d]
            decisive = item["wins"] + item["losses"]
            win_rate = round((item["wins"] / decisive) * 100, 1) if decisive > 0 else 0.0
            result.append(
                {
                    "date": item["date"],
                    "net_pnl": str(item["net_pnl"]),
                    "gross_pnl": str(item["gross_pnl"]),
                    "trades_count": item["trades_count"],
                    "win_rate": win_rate,
                }
            )
        return result

    @staticmethod
    def calculate_breakdown_by_symbol(trades: List[Trade]) -> List[Dict[str, Any]]:
        closed = [t for t in trades if t.status == "closed" and t.net_pnl is not None]
        symbols: Dict[str, Dict[str, Any]] = {}

        for t in closed:
            sym = t.symbol.upper()
            if sym not in symbols:
                symbols[sym] = {
                    "symbol": sym,
                    "trades_count": 0,
                    "net_pnl": Decimal("0"),
                    "gross_wins": Decimal("0"),
                    "gross_losses": Decimal("0"),
                    "wins": 0,
                    "losses": 0,
                }
            symbols[sym]["trades_count"] += 1
            symbols[sym]["net_pnl"] += t.net_pnl
            if t.net_pnl > Decimal("0"):
                symbols[sym]["wins"] += 1
                if t.gross_pnl:
                    symbols[sym]["gross_wins"] += t.gross_pnl
            elif t.net_pnl < Decimal("0"):
                symbols[sym]["losses"] += 1
                if t.gross_pnl:
                    symbols[sym]["gross_losses"] += abs(t.gross_pnl)

        result = []
        for sym, d in symbols.items():
            decisive = d["wins"] + d["losses"]
            wr = round((d["wins"] / decisive) * 100, 1) if decisive > 0 else 0.0
            pf = round(float(d["gross_wins"] / d["gross_losses"]), 2) if d["gross_losses"] > 0 else None
            result.append(
                {
                    "symbol": sym,
                    "trades_count": d["trades_count"],
                    "win_rate": wr,
                    "net_pnl": str(d["net_pnl"]),
                    "profit_factor": pf,
                }
            )

        return sorted(result, key=lambda x: Decimal(x["net_pnl"]), reverse=True)
