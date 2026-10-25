from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional
import uuid

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.brokers.base import BrokerAccountSummary, BrokerExecution
from app.brokers.registry import get_broker_adapter
from app.core.encryption import decrypt_token, encrypt_token
from app.core.exceptions import BadRequestError, NotFoundError, UnauthorizedError
from app.models.broker_connection import BrokerConnection
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
    ) -> Dict[str, Any]:
        """Fetch executions from broker and map idempotently into journal trades without duplicates."""
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
            executions: List[BrokerExecution] = await adapter.fetch_executions()
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
            target_account_id = (await self.db.execute(any_acc_stmt)).scalar_one()

        new_trades_count = 0
        new_executions_count = len(new_executions)

        # 2. Insert new executions and construct corresponding Journal Trades
        for ex in new_executions:
            # Create Journal Trade representing the execution
            trade = Trade(
                user_id=user_id,
                account_id=target_account_id,
                symbol=ex.symbol,
                asset_class=ex.segment or "EQUITY",
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
                created_at=now,
                updated_at=now,
            )
            self.db.add(trade)
            await self.db.flush()

            # Attach execution record
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
                created_at=now,
            )
            self.db.add(execution_record)
            new_trades_count += 1

        # 3. Update connection state
        conn.sync_status = "success"
        conn.last_sync_at = now
        conn.last_error = None
        await self.db.flush()

        # 4. Dispatch success notification
        notif_service = NotificationService(self.db)
        if new_trades_count > 0:
            msg = f"Successfully synced {new_executions_count} executions and created {new_trades_count} journal trades from {clean_broker.title()}."
        else:
            msg = f"Dhan sync complete: All {len(executions)} trades in your account are already up to date."

        await notif_service.create_notification(
            user_id=user_id,
            data=NotificationCreate(
                title=f"{clean_broker.upper()} Sync Complete",
                message=msg,
                type="success",
                action_url="/journal",
            ),
        )

        return {
            "broker_id": clean_broker,
            "total_fetched": len(executions),
            "new_executions": new_executions_count,
            "new_trades": new_trades_count,
            "skipped_duplicates": len(executions) - new_executions_count,
            "last_sync_at": now.isoformat(),
        }
