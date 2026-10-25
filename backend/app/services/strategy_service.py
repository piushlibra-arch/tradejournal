import uuid
from decimal import Decimal
from typing import List, Optional, Tuple

from sqlalchemy import and_, delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.strategy import Strategy
from app.models.trade import Trade
from app.models.trading_account import TradingAccount
from app.schemas.strategy import StrategyCreate, StrategyPerformance, StrategyUpdate


class StrategyService:
    @staticmethod
    async def create_strategy(
        db: AsyncSession,
        user_id: uuid.UUID,
        data: StrategyCreate,
    ) -> Strategy:
        strategy = Strategy(
            user_id=user_id,
            name=data.name,
            description=data.description,
            asset_class=data.asset_class,
            status=data.status,
            entry_rules=data.entry_rules,
            exit_rules=data.exit_rules,
        )
        db.add(strategy)
        await db.commit()
        await db.refresh(strategy)
        return strategy

    @staticmethod
    async def get_strategy(
        db: AsyncSession,
        user_id: uuid.UUID,
        strategy_id: uuid.UUID,
    ) -> Strategy:
        stmt = select(Strategy).where(
            and_(
                Strategy.id == strategy_id,
                Strategy.user_id == user_id,
            )
        )
        res = await db.execute(stmt)
        strategy = res.scalar_one_or_none()
        if not strategy:
            raise NotFoundError(f"Strategy {strategy_id} not found")
        return strategy

    @staticmethod
    async def list_strategies(
        db: AsyncSession,
        user_id: uuid.UUID,
        status: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Tuple[List[Strategy], int]:
        filters = [Strategy.user_id == user_id]
        if status:
            filters.append(Strategy.status == status)

        stmt = select(Strategy).where(and_(*filters)).order_by(Strategy.name.asc()).limit(limit).offset(offset)
        result = await db.execute(stmt)
        items = list(result.scalars().all())

        count_stmt = select(Strategy.id).where(and_(*filters))
        count_res = await db.execute(count_stmt)
        total = len(count_res.scalars().all())

        return items, total

    @staticmethod
    async def update_strategy(
        db: AsyncSession,
        user_id: uuid.UUID,
        strategy_id: uuid.UUID,
        data: StrategyUpdate,
    ) -> Strategy:
        strategy = await StrategyService.get_strategy(db, user_id, strategy_id)

        update_dict = data.model_dump(exclude_unset=True)
        for key, val in update_dict.items():
            setattr(strategy, key, val)

        await db.commit()
        await db.refresh(strategy)
        return strategy

    @staticmethod
    async def delete_strategy(
        db: AsyncSession,
        user_id: uuid.UUID,
        strategy_id: uuid.UUID,
    ) -> None:
        strategy = await StrategyService.get_strategy(db, user_id, strategy_id)
        stmt = delete(Strategy).where(and_(Strategy.id == strategy.id, Strategy.user_id == user_id))
        await db.execute(stmt)
        await db.commit()

    @staticmethod
    async def get_strategy_performance(
        db: AsyncSession,
        user_id: uuid.UUID,
        strategy_id: uuid.UUID,
        account_id: Optional[uuid.UUID] = None,
    ) -> StrategyPerformance:
        strategy = await StrategyService.get_strategy(db, user_id, strategy_id)

        # Get all trades linked to this strategy
        trade_filters = [
            Trade.strategy_id == strategy_id,
            Trade.user_id == user_id,
        ]
        if account_id:
            acc_check = await db.execute(
                select(TradingAccount.id).where(
                    TradingAccount.id == account_id,
                    TradingAccount.user_id == user_id,
                )
            )
            if not acc_check.scalar_one_or_none():
                raise NotFoundError("Trading account not found or access denied")
            trade_filters.append(Trade.account_id == account_id)

        stmt = select(Trade).where(and_(*trade_filters))
        res = await db.execute(stmt)
        trades = list(res.scalars().all())

        total = len(trades)
        wins = [t for t in trades if t.net_pnl is not None and t.net_pnl > 0]
        losses = [t for t in trades if t.net_pnl is not None and t.net_pnl < 0]

        total_wins = len(wins)
        total_losses = len(losses)
        effective_trades = total_wins + total_losses

        win_rate = (total_wins / effective_trades * 100.0) if effective_trades > 0 else 0.0

        gross_profit = sum((t.net_pnl for t in wins), Decimal("0"))
        gross_loss = abs(sum((t.net_pnl for t in losses), Decimal("0")))
        net_pnl = sum((t.net_pnl for t in trades if t.net_pnl is not None), Decimal("0"))

        if gross_loss > 0:
            profit_factor = round(float(gross_profit / gross_loss), 2)
        elif gross_profit > 0:
            profit_factor = 999.99
        else:
            profit_factor = 0.0

        avg_trade = (net_pnl / Decimal(total)) if total > 0 else Decimal("0")

        return StrategyPerformance(
            strategy_id=strategy.id,
            strategy_name=strategy.name,
            total_trades=total,
            winning_trades=total_wins,
            losing_trades=total_losses,
            win_rate=round(win_rate, 2),
            net_pnl=net_pnl,
            profit_factor=profit_factor,
            avg_trade_pnl=round(avg_trade, 2),
        )
