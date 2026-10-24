import uuid
from typing import List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError, NotFoundError
from app.models.trading_account import TradingAccount
from app.schemas.account import AccountCreate, AccountUpdate


class AccountService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_account(self, user_id: uuid.UUID, data: AccountCreate) -> TradingAccount:
        account = TradingAccount(
            user_id=user_id,
            name=data.name,
            broker_name=data.broker_name,
            account_type=data.account_type.value if hasattr(data.account_type, "value") else str(data.account_type),
            currency=data.currency,
            initial_balance=data.initial_balance,
            start_date=data.start_date,
            account_rules=data.account_rules,
        )
        self.db.add(account)
        await self.db.commit()
        await self.db.refresh(account)
        return account

    async def get_accounts(self, user_id: uuid.UUID) -> List[TradingAccount]:
        result = await self.db.execute(select(TradingAccount).where(TradingAccount.user_id == user_id).order_by(TradingAccount.created_at.desc()))
        return list(result.scalars().all())

    async def get_account(self, account_id: uuid.UUID, user_id: uuid.UUID) -> TradingAccount:
        result = await self.db.execute(select(TradingAccount).where(TradingAccount.id == account_id))
        account = result.scalar_one_or_none()
        if not account:
            raise NotFoundError("Trading account")
        if account.user_id != user_id:
            raise ForbiddenError()
        return account

    async def update_account(self, account_id: uuid.UUID, user_id: uuid.UUID, data: AccountUpdate) -> TradingAccount:
        account = await self.get_account(account_id, user_id)
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if hasattr(value, "value"):
                setattr(account, key, value.value)
            else:
                setattr(account, key, value)
        await self.db.commit()
        await self.db.refresh(account)
        return account

    async def delete_account(self, account_id: uuid.UUID, user_id: uuid.UUID) -> None:
        account = await self.get_account(account_id, user_id)
        # Soft delete / archive to preserve trades
        account.status = "archived"
        await self.db.commit()
