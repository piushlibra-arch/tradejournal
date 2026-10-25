import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.currency import calculate_trade_pnl, resolve_instrument_currency
from app.core.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.models.tag import TradeTag
from app.models.trade import Trade
from app.models.trading_account import TradingAccount
from app.schemas.trade import TradeCreate, TradeUpdate


class TradeService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _calculate_pnl(self, trade_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate P&L if not explicitly provided using centralized decimal calculator."""
        gross_pnl, net_pnl = calculate_trade_pnl(
            direction=trade_data.get("direction"),
            entry_price=trade_data.get("entry_price"),
            exit_price=trade_data.get("exit_price"),
            quantity=trade_data.get("quantity"),
            contract_size=trade_data.get("contract_size", Decimal("1")) or Decimal("1"),
            commission=trade_data.get("commission", Decimal("0")) or Decimal("0"),
            fees=trade_data.get("fees", Decimal("0")) or Decimal("0"),
            swap=trade_data.get("swap", Decimal("0")) or Decimal("0"),
            asset_class=trade_data.get("asset_class"),
        )
        if trade_data.get("gross_pnl") is None and gross_pnl is not None:
            trade_data["gross_pnl"] = gross_pnl
        if trade_data.get("net_pnl") is None and net_pnl is not None:
            trade_data["net_pnl"] = net_pnl

        return trade_data

    async def create_trade(self, user_id: uuid.UUID, data: TradeCreate) -> Trade:
        trade_dict = data.model_dump(exclude={"tag_ids"})
        trade_dict["user_id"] = user_id

        try:
            trade_dict["account_id"] = uuid.UUID(trade_dict["account_id"])
        except ValueError:
            raise BadRequestError("Invalid account_id format")

        # Validate account ownership & retrieve account currency
        acc_stmt = select(TradingAccount).where(
            TradingAccount.id == trade_dict["account_id"],
            TradingAccount.user_id == user_id,
        )
        acc_res = await self.db.execute(acc_stmt)
        account = acc_res.scalar_one_or_none()
        if not account:
            raise NotFoundError("Trading account not found or access denied")

        if not trade_dict.get("currency"):
            trade_dict["currency"] = resolve_instrument_currency(
                symbol=trade_dict["symbol"],
                asset_class=trade_dict.get("asset_class"),
                account_currency=account.currency,
            )

        if trade_dict.get("strategy_id"):
            try:
                trade_dict["strategy_id"] = uuid.UUID(trade_dict["strategy_id"])
            except ValueError:
                raise BadRequestError("Invalid strategy_id format")

        # Handle enum values
        if hasattr(trade_dict["direction"], "value"):
            trade_dict["direction"] = trade_dict["direction"].value
        if hasattr(trade_dict["status"], "value"):
            trade_dict["status"] = trade_dict["status"].value

        trade_dict = self._calculate_pnl(trade_dict)

        trade = Trade(**trade_dict)
        self.db.add(trade)
        await self.db.flush()

        # Handle tags
        if data.tag_ids:
            for tag_str in data.tag_ids:
                try:
                    tag_uuid = uuid.UUID(tag_str)
                    trade_tag = TradeTag(trade_id=trade.id, tag_id=tag_uuid)
                    self.db.add(trade_tag)
                except ValueError:
                    continue

        await self.db.commit()

        # Reload with relationships
        return await self.get_trade(trade.id, user_id)

    async def get_trades(
        self,
        user_id: uuid.UUID,
        page: int = 1,
        page_size: int = 50,
        account_id: Optional[uuid.UUID] = None,
        symbol: Optional[str] = None,
        direction: Optional[str] = None,
        status: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        min_pnl: Optional[Decimal] = None,
        max_pnl: Optional[Decimal] = None,
        setup_name: Optional[str] = None,
        sort_by: str = "entry_time",
        sort_order: str = "desc",
    ) -> Tuple[List[Trade], int]:
        query = select(Trade).where(Trade.user_id == user_id)
        count_query = select(func.count(Trade.id)).where(Trade.user_id == user_id)

        filters = []
        if account_id:
            acc_check = await self.db.execute(
                select(TradingAccount.id).where(
                    TradingAccount.id == account_id,
                    TradingAccount.user_id == user_id,
                )
            )
            if not acc_check.scalar_one_or_none():
                raise NotFoundError("Trading account not found or access denied")
            filters.append(Trade.account_id == account_id)
        if symbol:
            filters.append(Trade.symbol.ilike(f"%{symbol}%"))
        if direction:
            filters.append(Trade.direction == direction.lower())
        if status:
            filters.append(Trade.status == status.lower())
        if start_date:
            filters.append(Trade.entry_time >= start_date)
        if end_date:
            filters.append(Trade.entry_time <= end_date)
        if min_pnl is not None:
            filters.append(Trade.net_pnl >= min_pnl)
        if max_pnl is not None:
            filters.append(Trade.net_pnl <= max_pnl)
        if setup_name:
            filters.append(Trade.setup_name.ilike(f"%{setup_name}%"))

        if filters:
            query = query.where(and_(*filters))
            count_query = count_query.where(and_(*filters))

        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Sort safety
        valid_columns = {
            "entry_time": Trade.entry_time,
            "exit_time": Trade.exit_time,
            "net_pnl": Trade.net_pnl,
            "gross_pnl": Trade.gross_pnl,
            "symbol": Trade.symbol,
            "created_at": Trade.created_at,
        }
        sort_col = valid_columns.get(sort_by, Trade.entry_time)
        if sort_order.lower() == "asc":
            query = query.order_by(sort_col.asc())
        else:
            query = query.order_by(sort_col.desc())

        offset = (page - 1) * page_size
        query = (
            query.offset(offset)
            .limit(page_size)
            .options(
                selectinload(Trade.trade_tags).selectinload(TradeTag.tag),
                selectinload(Trade.executions),
            )
        )

        result = await self.db.execute(query)
        trades = list(result.scalars().all())
        return trades, total

    async def get_trade(self, trade_id: uuid.UUID, user_id: uuid.UUID) -> Trade:
        query = (
            select(Trade)
            .where(Trade.id == trade_id)
            .options(
                selectinload(Trade.trade_tags).selectinload(TradeTag.tag),
                selectinload(Trade.executions),
            )
        )
        result = await self.db.execute(query)
        trade = result.scalar_one_or_none()
        if not trade:
            raise NotFoundError("Trade")
        if trade.user_id != user_id:
            raise ForbiddenError()
        return trade

    async def update_trade(self, trade_id: uuid.UUID, user_id: uuid.UUID, data: TradeUpdate) -> Trade:
        trade = await self.get_trade(trade_id, user_id)
        update_data = data.model_dump(exclude_unset=True, exclude={"tag_ids"})

        for key, value in update_data.items():
            if hasattr(value, "value"):
                setattr(trade, key, value.value)
            elif key == "strategy_id" and value is not None:
                setattr(trade, key, uuid.UUID(value))
            else:
                setattr(trade, key, value)

        # Recalculate P&L if pricing or sizing changed
        recalc_fields = {"entry_price", "exit_price", "quantity", "contract_size", "direction", "commission", "fees", "swap"}
        if recalc_fields.intersection(update_data.keys()):
            trade_dict = {
                "direction": trade.direction,
                "entry_price": trade.entry_price,
                "exit_price": trade.exit_price,
                "quantity": trade.quantity,
                "contract_size": trade.contract_size,
                "commission": trade.commission,
                "fees": trade.fees,
                "swap": trade.swap,
                "gross_pnl": trade.gross_pnl if "gross_pnl" in update_data else None,
                "net_pnl": trade.net_pnl if "net_pnl" in update_data else None,
            }
            calculated = self._calculate_pnl(trade_dict)
            trade.gross_pnl = calculated.get("gross_pnl")
            trade.net_pnl = calculated.get("net_pnl")

        # Tags replacement if provided
        if data.tag_ids is not None:
            existing_tags = await self.db.execute(select(TradeTag).where(TradeTag.trade_id == trade_id))
            for tt in existing_tags.scalars().all():
                await self.db.delete(tt)
            await self.db.flush()

            for tag_str in data.tag_ids:
                try:
                    tag_uuid = uuid.UUID(tag_str)
                    self.db.add(TradeTag(trade_id=trade.id, tag_id=tag_uuid))
                except ValueError:
                    continue

        await self.db.commit()
        return await self.get_trade(trade_id, user_id)

    async def delete_trade(self, trade_id: uuid.UUID, user_id: uuid.UUID) -> None:
        trade = await self.get_trade(trade_id, user_id)
        await self.db.delete(trade)
        await self.db.commit()
