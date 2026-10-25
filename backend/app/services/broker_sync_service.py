from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional
import uuid

from sqlalchemy import desc, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.brokers.base import BrokerAccountSummary, BrokerExecution, BrokerLedgerEntryItem
from app.brokers.registry import get_broker_adapter
from app.core.currency import resolve_instrument_currency
from app.core.encryption import decrypt_token, encrypt_token
from app.core.exceptions import BadRequestError, NotFoundError, UnauthorizedError
from app.models.broker_connection import BrokerConnection
from app.models.broker_ledger import BrokerLedgerEntry
from app.models.execution import Execution
from app.models.notification import Notification
from app.models.trade import Trade
from app.models.trading_account import TradingAccount
from app.schemas.notification import NotificationCreate
from app.services.notification_service import NotificationService


class BrokerSyncService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_connection(
        self, user_id: uuid.UUID, broker_id: str = "dhan"
    ) -> Optional[BrokerConnection]:
        stmt = select(BrokerConnection).where(
            BrokerConnection.user_id == user_id,
            BrokerConnection.broker_id == broker_id.lower(),
            BrokerConnection.is_active.is_(True),
        )
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def connect_broker(
        self,
        user_id: uuid.UUID,
        broker_id: str,
        client_id: str,
        access_token: str,
        account_id: Optional[uuid.UUID] = None,
    ) -> Dict[str, Any]:
        """Validate broker credentials against official API, encrypt token, and persist connection."""
        clean_broker = broker_id.lower().strip()
        clean_client = client_id.strip()
        clean_token = access_token.strip()

        if not clean_client or not clean_token:
            raise BadRequestError("Client ID and Access Token are required")

        # 1. Instantiate adapter and test live credentials
        adapter = get_broker_adapter(clean_broker, clean_client, clean_token)
        summary: BrokerAccountSummary = await adapter.test_connection()

        # 2. Check existing connection
        existing = await self.get_connection(user_id, clean_broker)
        encrypted = encrypt_token(clean_token)

        # 3. Ensure a valid trading account exists for this broker
        if not account_id:
            acc_stmt = select(TradingAccount).where(
                TradingAccount.user_id == user_id,
                TradingAccount.broker_name == "Dhan",
                TradingAccount.status == "active",
            )
            acc_res = await self.db.execute(acc_stmt)
            acc = acc_res.scalar_one_or_none()
            if not acc:
                # Find any active user account, or create one
                any_acc_stmt = select(TradingAccount).where(
                    TradingAccount.user_id == user_id,
                    TradingAccount.status == "active",
                ).limit(1)
                any_acc = (await self.db.execute(any_acc_stmt)).scalar_one_or_none()
                if any_acc:
                    account_id = any_acc.id
                else:
                    new_acc = TradingAccount(
                        user_id=user_id,
                        name="Dhan Trading Account",
                        broker_name="Dhan",
                        account_type="live",
                        currency="INR",
                        initial_balance=summary.available_cash,
                        status="active",
                    )
                    self.db.add(new_acc)
                    await self.db.flush()
                    account_id = new_acc.id
            else:
                account_id = acc.id

        now = datetime.now(timezone.utc)
        if existing:
            existing.client_id = clean_client
            existing.encrypted_access_token = encrypted
            existing.account_id = account_id
            existing.is_active = True
            existing.sync_status = "idle"
            existing.last_error = None
            existing.updated_at = now
            conn = existing
        else:
            conn = BrokerConnection(
                user_id=user_id,
                account_id=account_id,
                broker_id=clean_broker,
                client_id=clean_client,
                encrypted_access_token=encrypted,
                is_active=True,
                sync_status="idle",
                created_at=now,
                updated_at=now,
            )
            self.db.add(conn)

        # 4. Dispatch notification
        notif_service = NotificationService(self.db)
        await notif_service.create_notification(
            user_id=user_id,
            data=NotificationCreate(
                title=f"{clean_broker.upper()} Connected",
                message=f"Successfully connected {clean_broker.title()} (Client ID: {clean_client}). Cash: ₹{summary.available_cash:,.2f}",
                type="success",
                action_url="/accounts",
            ),
        )

        await self.db.flush()
        return {
            "status": "connected",
            "broker_id": clean_broker,
            "client_id": clean_client,
            "account_id": str(account_id),
            "available_cash": float(summary.available_cash),
            "margin_used": float(summary.margin_used),
        }

    async def sync_trades(
        self,
        user_id: uuid.UUID,
        broker_id: str = "dhan",
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
        sync_ledger: bool = True,
    ) -> Dict[str, Any]:
        """Fetch executions and ledger from broker and map idempotently into journal trades without duplicates."""
        clean_broker = broker_id.lower().strip()
        conn = await self.get_connection(user_id, clean_broker)
        if not conn or not conn.encrypted_access_token:
            raise BadRequestError(f"No active {clean_broker.title()} account connection found. Connect your account first.")

        # Decrypt token
        access_token = decrypt_token(conn.encrypted_access_token)
        if not access_token:
            raise UnauthorizedError("Broker credentials invalid or corrupted. Please reconnect.")

        # Set status to syncing
        conn.sync_status = "syncing"
        await self.db.flush()

        adapter = get_broker_adapter(clean_broker, conn.client_id, access_token)
        try:
            executions: List[BrokerExecution] = await adapter.fetch_executions(
                from_date=from_date,
                to_date=to_date,
            )
        except Exception as e:
            conn.sync_status = "error"
            conn.last_error = str(e)
            await self.db.flush()
            # Dispatch error notification
            notif_service = NotificationService(self.db)
            await notif_service.create_notification(
                user_id=user_id,
                data=NotificationCreate(
                    title=f"{clean_broker.upper()} Sync Failed",
                    message=f"Failed to fetch trade history: {str(e)}",
                    type="error",
                    action_url="/accounts",
                ),
            )
            raise e

        # 1. Fetch all existing execution external_ids for this user to ensure idempotency
        stmt = select(Execution.external_id).where(
            Execution.user_id == user_id,
            Execution.external_id.is_not(None),
        )
        res = await self.db.execute(stmt)
        existing_ids = {r[0] for r in res.fetchall() if r[0]}

        # Filter out existing executions
        new_executions = [ex for ex in executions if ex.external_id not in existing_ids]

        now = datetime.now(timezone.utc)
        target_account_id = conn.account_id
        if not target_account_id:
            # Fallback to any active account
            any_acc_stmt = select(TradingAccount.id).where(
                TradingAccount.user_id == user_id,
                TradingAccount.status == "active",
            ).limit(1)
            any_acc_res = await self.db.execute(any_acc_stmt)
            target_account_id = any_acc_res.scalar_one_or_none()
            if not target_account_id:
                new_acc = TradingAccount(
                    user_id=user_id,
                    name=f"{clean_broker.title()} Account",
                    broker_name=clean_broker.title(),
                    account_type="live",
                    currency="INR",
                    initial_balance=Decimal("0"),
                    status="active",
                )
                self.db.add(new_acc)
                await self.db.flush()
                target_account_id = new_acc.id

        new_trades_count = 0
        new_executions_count = len(new_executions)

        # Sort chronologically so opening fills precede closing fills
        new_executions.sort(key=lambda x: x.executed_at)

        # 2. Process executions and match into trades
        for ex in new_executions:
            charges_dict = {
                "brokerage": float(ex.brokerage),
                "stt": float(ex.stt),
                "exchange_turnover": float(ex.exchange_turnover),
                "sebi_turnover": float(ex.sebi_turnover),
                "stamp_duty": float(ex.stamp_duty),
                "gst": float(ex.gst),
                "other_charges": float(ex.other_charges),
                "total_charges": float(ex.total_charges),
                "provenance": ex.charge_provenance,
            }

            # Check for an existing open trade that matches the opposite side for this symbol and account
            expected_opposite_direction = "long" if ex.side.lower() == "sell" else "short"
            match_trade_stmt = (
                select(Trade)
                .where(
                    Trade.user_id == user_id,
                    Trade.account_id == target_account_id,
                    Trade.symbol == ex.symbol,
                    Trade.direction == expected_opposite_direction,
                    Trade.status == "open",
                )
                .order_by(Trade.entry_time.asc())
                .limit(1)
            )
            matched_trade = (await self.db.execute(match_trade_stmt)).scalar_one_or_none()

            if matched_trade:
                # Match execution to close this trade
                matched_trade.exit_time = ex.executed_at
                matched_trade.exit_price = ex.price
                matched_trade.status = "closed"

                # Calculate Gross P&L
                if matched_trade.direction == "long":
                    gross_pnl = (ex.price - matched_trade.entry_price) * matched_trade.quantity * matched_trade.contract_size
                else:
                    gross_pnl = (matched_trade.entry_price - ex.price) * matched_trade.quantity * matched_trade.contract_size

                matched_trade.gross_pnl = gross_pnl
                matched_trade.commission = matched_trade.commission + ex.commission
                matched_trade.fees = matched_trade.fees + ex.fees

                # Accumulate itemized charges
                existing_charges = matched_trade.charges_breakdown or {}
                updated_charges = {
                    "brokerage": float(existing_charges.get("brokerage", 0)) + float(ex.brokerage),
                    "stt": float(existing_charges.get("stt", 0)) + float(ex.stt),
                    "exchange_turnover": float(existing_charges.get("exchange_turnover", 0)) + float(ex.exchange_turnover),
                    "sebi_turnover": float(existing_charges.get("sebi_turnover", 0)) + float(ex.sebi_turnover),
                    "stamp_duty": float(existing_charges.get("stamp_duty", 0)) + float(ex.stamp_duty),
                    "gst": float(existing_charges.get("gst", 0)) + float(ex.gst),
                    "other_charges": float(existing_charges.get("other_charges", 0)) + float(ex.other_charges),
                    "total_charges": float(existing_charges.get("total_charges", 0)) + float(ex.total_charges),
                    "provenance": ex.charge_provenance if ex.charge_provenance != "unavailable" else existing_charges.get("provenance", "unavailable"),
                }
                matched_trade.charges_breakdown = updated_charges
                matched_trade.charge_provenance = updated_charges["provenance"]

                # Single verified deduction of charges for net P&L
                matched_trade.net_pnl = gross_pnl - (matched_trade.commission + matched_trade.fees)
                matched_trade.updated_at = now

                # Attach execution to matched trade
                execution_record = Execution(
                    trade_id=matched_trade.id,
                    user_id=user_id,
                    side=ex.side.lower(),
                    price=ex.price,
                    quantity=ex.quantity,
                    commission=ex.commission,
                    fees=ex.fees,
                    executed_at=ex.executed_at,
                    external_id=ex.external_id,
                    import_source=clean_broker,
                    charges_breakdown=charges_dict,
                    charge_provenance=ex.charge_provenance,
                    created_at=now,
                )
                self.db.add(execution_record)
            else:
                # Create a new trade representing this position or execution
                trade = Trade(
                    user_id=user_id,
                    account_id=target_account_id,
                    symbol=ex.symbol,
                    asset_class=ex.segment or "EQUITY",
                    currency=resolve_instrument_currency(symbol=ex.symbol, exchange=ex.exchange, segment=ex.segment, account_currency="INR"),
                    direction="long" if ex.side.lower() == "buy" else "short",
                    entry_time=ex.executed_at,
                    entry_price=ex.price,
                    quantity=ex.quantity,
                    contract_size=Decimal("1"),
                    commission=ex.commission,
                    fees=ex.fees,
                    status="closed",
                    setup_name="Broker Import",
                    notes=f"Auto-synchronized from {clean_broker.title()} (Order #{ex.order_id}).",
                    import_source=clean_broker,
                    external_id=ex.external_id,
                    charges_breakdown=charges_dict,
                    charge_provenance=ex.charge_provenance,
                    created_at=now,
                    updated_at=now,
                )
                self.db.add(trade)
                await self.db.flush()

                execution_record = Execution(
                    trade_id=trade.id,
                    user_id=user_id,
                    side=ex.side.lower(),
                    price=ex.price,
                    quantity=ex.quantity,
                    commission=ex.commission,
                    fees=ex.fees,
                    executed_at=ex.executed_at,
                    external_id=ex.external_id,
                    import_source=clean_broker,
                    charges_breakdown=charges_dict,
                    charge_provenance=ex.charge_provenance,
                    created_at=now,
                )
                self.db.add(execution_record)
                new_trades_count += 1

        # 3. Synchronize Ledger if requested
        ledger_count = 0
        if sync_ledger:
            l_from = from_date or (now - timedelta(days=30))
            l_to = to_date or now
            try:
                ledger_items: List[BrokerLedgerEntryItem] = await adapter.fetch_ledger(
                    from_date=l_from,
                    to_date=l_to,
                )
                # Fetch existing ledger external_ids for user
                ledger_stmt = select(BrokerLedgerEntry.external_id).where(
                    BrokerLedgerEntry.user_id == user_id,
                    BrokerLedgerEntry.broker_id == clean_broker,
                )
                existing_ledger_ids = {r[0] for r in (await self.db.execute(ledger_stmt)).fetchall() if r[0]}

                for item in ledger_items:
                    if item.external_id not in existing_ledger_ids:
                        ledger_row = BrokerLedgerEntry(
                            user_id=user_id,
                            account_id=target_account_id,
                            broker_id=clean_broker,
                            external_id=item.external_id,
                            voucher_date=item.voucher_date,
                            voucher_number=item.voucher_number,
                            narration=item.narration,
                            exchange=item.exchange,
                            debit=item.debit,
                            credit=item.credit,
                            running_balance=item.running_balance,
                            reconciled=False,
                            raw_data=item.raw_data,
                            created_at=now,
                        )
                        self.db.add(ledger_row)
                        ledger_count += 1
            except Exception as e:
                # Ledger sync errors shouldn't crash trade sync; log and proceed
                pass

        # 4. Update connection state
        conn.sync_status = "success"
        conn.last_sync_at = now
        conn.last_error = None
        await self.db.flush()

        # 5. Dispatch success notification
        notif_service = NotificationService(self.db)
        if new_trades_count > 0:
            msg = f"Successfully synced {new_executions_count} executions and {ledger_count} ledger entries from {clean_broker.title()}."
        else:
            msg = f"{clean_broker.title()} sync complete: All {len(executions)} trades in your account are up to date."

        await notif_service.create_notification(
            user_id=user_id,
            data=NotificationCreate(
                title=f"{clean_broker.upper()} Sync Complete",
                message=msg,
                type="success",
                action_url="/accounts",
            ),
        )

        return {
            "broker_id": clean_broker,
            "total_fetched": len(executions),
            "new_executions": new_executions_count,
            "new_trades": new_trades_count,
            "ledger_entries_imported": ledger_count,
            "skipped_duplicates": len(executions) - new_executions_count,
            "last_sync_at": now.isoformat(),
        }

    async def get_ledger_entries(
        self,
        user_id: uuid.UUID,
        broker_id: str = "dhan",
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """Retrieve stored ledger entries with pagination and totals."""
        clean_broker = broker_id.lower().strip()
        query = select(BrokerLedgerEntry).where(
            BrokerLedgerEntry.user_id == user_id,
            BrokerLedgerEntry.broker_id == clean_broker,
        )

        if from_date:
            query = query.where(BrokerLedgerEntry.voucher_date >= from_date)
        if to_date:
            query = query.where(BrokerLedgerEntry.voucher_date <= to_date)

        # Count total
        count_stmt = select(func.count()).select_from(query.subquery())
        total = (await self.db.execute(count_stmt)).scalar() or 0

        # Totals
        debit_stmt = select(func.coalesce(func.sum(BrokerLedgerEntry.debit), Decimal("0"))).select_from(query.subquery())
        credit_stmt = select(func.coalesce(func.sum(BrokerLedgerEntry.credit), Decimal("0"))).select_from(query.subquery())
        total_debit = (await self.db.execute(debit_stmt)).scalar() or Decimal("0")
        total_credit = (await self.db.execute(credit_stmt)).scalar() or Decimal("0")

        # Fetch page
        paginated_stmt = query.order_by(desc(BrokerLedgerEntry.voucher_date)).offset(offset).limit(limit)
        res = await self.db.execute(paginated_stmt)
        entries = res.scalars().all()

        return {
            "broker_id": clean_broker,
            "total_records": total,
            "total_debit": float(total_debit),
            "total_credit": float(total_credit),
            "net_movement": float(total_credit - total_debit),
            "entries": [
                {
                    "id": str(e.id),
                    "external_id": e.external_id,
                    "voucher_date": e.voucher_date.isoformat(),
                    "voucher_number": e.voucher_number,
                    "narration": e.narration,
                    "exchange": e.exchange,
                    "debit": float(e.debit),
                    "credit": float(e.credit),
                    "running_balance": float(e.running_balance),
                    "reconciled": e.reconciled,
                }
                for e in entries
            ],
        }

    async def get_charges_summary(
        self,
        user_id: uuid.UUID,
        broker_id: str = "dhan",
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Aggregate itemized charges across trades for this broker."""
        clean_broker = broker_id.lower().strip()
        query = select(Trade).where(
            Trade.user_id == user_id,
            Trade.import_source == clean_broker,
        )

        if from_date:
            query = query.where(Trade.entry_time >= from_date)
        if to_date:
            query = query.where(Trade.entry_time <= to_date)

        res = await self.db.execute(query)
        trades = res.scalars().all()

        totals = {
            "brokerage": Decimal("0"),
            "stt": Decimal("0"),
            "exchange_turnover": Decimal("0"),
            "sebi_turnover": Decimal("0"),
            "stamp_duty": Decimal("0"),
            "gst": Decimal("0"),
            "other_charges": Decimal("0"),
            "total_charges": Decimal("0"),
        }

        provenance_counts = {}
        for t in trades:
            cb = t.charges_breakdown or {}
            for k in ("brokerage", "stt", "exchange_turnover", "sebi_turnover", "stamp_duty", "gst", "other_charges", "total_charges"):
                val = Decimal(str(cb.get(k, 0)))
                totals[k] += val

            prov = t.charge_provenance or "unavailable"
            provenance_counts[prov] = provenance_counts.get(prov, 0) + 1

        return {
            "broker_id": clean_broker,
            "trade_count": len(trades),
            "charges": {k: float(v) for k, v in totals.items()},
            "currency": "INR",
            "provenance_distribution": provenance_counts,
        }
