import uuid
from typing import Any, Dict, List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.currency import resolve_instrument_currency
from app.core.exceptions import ForbiddenError, NotFoundError
from app.importers.generic_csv import GenericCSVImporter
from app.models.execution import Execution
from app.models.import_job import ImportJob, ImportRowError
from app.models.trade import Trade
from app.models.trading_account import TradingAccount


class ImportService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.importer = GenericCSVImporter()

    async def _verify_account(self, account_id: uuid.UUID, user_id: uuid.UUID) -> TradingAccount:
        result = await self.db.execute(select(TradingAccount).where(TradingAccount.id == account_id))
        account = result.scalar_one_or_none()
        if not account:
            raise NotFoundError("Trading account")
        if account.user_id != user_id:
            raise ForbiddenError()
        return account

    async def _get_existing_external_ids(self, account_id: uuid.UUID, user_id: uuid.UUID) -> set:
        query = select(Trade.external_id).where(
            Trade.account_id == account_id,
            Trade.user_id == user_id,
            Trade.external_id.isnot(None),
        )
        result = await self.db.execute(query)
        return {r[0] for r in result.all() if r[0]}

    def preview(self, csv_content: str, broker_source: str = "generic") -> Dict[str, Any]:
        return self.importer.parse_preview(csv_content)

    async def validate(
        self,
        user_id: uuid.UUID,
        account_id: uuid.UUID,
        csv_content: str,
        column_mapping: Dict[str, str],
        broker_source: str = "generic",
    ) -> Dict[str, Any]:
        account = await self._verify_account(account_id, user_id)
        existing_ids = await self._get_existing_external_ids(account_id, user_id)

        valid_trades, duplicates, errors = self.importer.validate_and_parse_rows(
            csv_content=csv_content,
            column_mapping=column_mapping,
            existing_external_ids=existing_ids,
        )

        total_rows = len(valid_trades) + len(duplicates) + len(errors)
        return {
            "total_rows": total_rows,
            "valid_rows_count": len(valid_trades),
            "duplicate_rows_count": len(duplicates),
            "error_rows_count": len(errors),
            "duplicates": duplicates[:50],  # sample preview
            "errors": errors[:50],
            "sample_valid_trades": [{k: (str(v) if v is not None else None) for k, v in t.items()} for t in valid_trades[:5]],
        }

    async def confirm(
        self,
        user_id: uuid.UUID,
        account_id: uuid.UUID,
        csv_content: str,
        column_mapping: Dict[str, str],
        filename: str = "trades.csv",
        broker_source: str = "generic",
        skip_duplicates: bool = True,
    ) -> ImportJob:
        account = await self._verify_account(account_id, user_id)
        existing_ids = await self._get_existing_external_ids(account_id, user_id)

        valid_trades, duplicates, errors = self.importer.validate_and_parse_rows(
            csv_content=csv_content,
            column_mapping=column_mapping,
            existing_external_ids=existing_ids,
        )

        total_rows = len(valid_trades) + len(duplicates) + len(errors)
        job = ImportJob(
            user_id=user_id,
            account_id=account_id,
            filename=filename,
            broker_source=broker_source,
            status="completed" if len(errors) == 0 else "partial",
            total_rows=total_rows,
            imported_rows=len(valid_trades),
            skipped_rows=len(duplicates),
            error_rows=len(errors),
            column_mapping=column_mapping,
            summary={
                "valid": len(valid_trades),
                "duplicates": len(duplicates),
                "errors": len(errors),
            },
        )
        self.db.add(job)
        await self.db.flush()

        # Record error rows for audit
        for err in errors:
            row_err = ImportRowError(
                job_id=job.id,
                row_number=err["row_number"],
                raw_data=err.get("raw_data"),
                error_message=err["error_message"],
            )
            self.db.add(row_err)

        # Batch insert valid trades and their executions
        for t_data in valid_trades:
            trade = Trade(
                user_id=user_id,
                account_id=account_id,
                symbol=t_data["symbol"],
                currency=resolve_instrument_currency(symbol=t_data["symbol"], account_currency=account.currency),
                direction=t_data["direction"],
                entry_time=t_data["entry_time"],
                exit_time=t_data.get("exit_time"),
                entry_price=t_data["entry_price"],
                exit_price=t_data.get("exit_price"),
                quantity=t_data["quantity"],
                contract_size=t_data.get("contract_size"),
                gross_pnl=t_data.get("gross_pnl"),
                commission=t_data.get("commission"),
                fees=t_data.get("fees"),
                swap=t_data.get("swap"),
                net_pnl=t_data.get("net_pnl"),
                stop_loss_price=t_data.get("stop_loss_price"),
                take_profit_price=t_data.get("take_profit_price"),
                setup_name=t_data.get("setup_name"),
                notes=t_data.get("notes"),
                external_id=t_data.get("external_id"),
                status=t_data["status"],
                import_source=f"csv:{broker_source}",
            )
            self.db.add(trade)
            await self.db.flush()

            # Create entry execution fill
            entry_exec = Execution(
                trade_id=trade.id,
                user_id=user_id,
                side="buy" if t_data["direction"] == "long" else "sell",
                price=t_data["entry_price"],
                quantity=t_data["quantity"],
                commission=t_data.get("commission") / 2 if t_data.get("commission") else 0,
                fees=t_data.get("fees") / 2 if t_data.get("fees") else 0,
                executed_at=t_data["entry_time"],
                external_id=t_data.get("external_id"),
                import_source=f"csv:{broker_source}",
            )
            self.db.add(entry_exec)

            # If closed, create exit execution fill
            if t_data.get("exit_price") and t_data.get("exit_time"):
                exit_exec = Execution(
                    trade_id=trade.id,
                    user_id=user_id,
                    side="sell" if t_data["direction"] == "long" else "buy",
                    price=t_data["exit_price"],
                    quantity=t_data["quantity"],
                    commission=t_data.get("commission") / 2 if t_data.get("commission") else 0,
                    fees=t_data.get("fees") / 2 if t_data.get("fees") else 0,
                    executed_at=t_data["exit_time"],
                    import_source=f"csv:{broker_source}",
                )
                self.db.add(exit_exec)

        await self.db.commit()
        await self.db.refresh(job)
        return job

    async def list_jobs(self, user_id: uuid.UUID) -> List[ImportJob]:
        result = await self.db.execute(select(ImportJob).where(ImportJob.user_id == user_id).order_by(ImportJob.created_at.desc()))
        return list(result.scalars().all())

    async def get_job(self, job_id: uuid.UUID, user_id: uuid.UUID) -> ImportJob:
        result = await self.db.execute(select(ImportJob).where(ImportJob.id == job_id))
        job = result.scalar_one_or_none()
        if not job:
            raise NotFoundError("Import job")
        if job.user_id != user_id:
            raise ForbiddenError()
        return job
