"""add broker_ledger_entries and charges breakdown

Revision ID: e82b7190c102
Revises: e738b5f39a01
Create Date: 2026-10-25 14:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e82b7190c102'
down_revision: Union[str, Sequence[str], None] = 'e738b5f39a01'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create broker_ledger_entries table
    op.create_table(
        'broker_ledger_entries',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('account_id', sa.UUID(), nullable=True),
        sa.Column('broker_id', sa.String(length=50), nullable=False, server_default='dhan'),
        sa.Column('external_id', sa.String(length=100), nullable=False),
        sa.Column('voucher_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('voucher_number', sa.String(length=100), nullable=True),
        sa.Column('narration', sa.Text(), nullable=False),
        sa.Column('exchange', sa.String(length=50), nullable=True, server_default='NSE'),
        sa.Column('debit', sa.Numeric(precision=20, scale=8), nullable=False, server_default='0'),
        sa.Column('credit', sa.Numeric(precision=20, scale=8), nullable=False, server_default='0'),
        sa.Column('running_balance', sa.Numeric(precision=20, scale=8), nullable=False, server_default='0'),
        sa.Column('reconciled', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('raw_data', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['account_id'], ['trading_accounts.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_broker_ledger_entries_user_id'), 'broker_ledger_entries', ['user_id'], unique=False)
    op.create_index(op.f('ix_broker_ledger_entries_account_id'), 'broker_ledger_entries', ['account_id'], unique=False)
    op.create_index(op.f('ix_broker_ledger_entries_broker_id'), 'broker_ledger_entries', ['broker_id'], unique=False)
    op.create_index(op.f('ix_broker_ledger_entries_external_id'), 'broker_ledger_entries', ['external_id'], unique=False)
    op.create_index(op.f('ix_broker_ledger_entries_voucher_date'), 'broker_ledger_entries', ['voucher_date'], unique=False)

    # 2. Add charges columns to executions
    op.add_column('executions', sa.Column('charges_breakdown', sa.JSON(), nullable=True))
    op.add_column('executions', sa.Column('charge_provenance', sa.String(length=50), nullable=True, server_default='unavailable'))

    # 3. Add charges columns to trades
    op.add_column('trades', sa.Column('charges_breakdown', sa.JSON(), nullable=True))
    op.add_column('trades', sa.Column('charge_provenance', sa.String(length=50), nullable=True, server_default='unavailable'))


def downgrade() -> None:
    op.drop_column('trades', 'charge_provenance')
    op.drop_column('trades', 'charges_breakdown')
    op.drop_column('executions', 'charge_provenance')
    op.drop_column('executions', 'charges_breakdown')

    op.drop_index(op.f('ix_broker_ledger_entries_voucher_date'), table_name='broker_ledger_entries')
    op.drop_index(op.f('ix_broker_ledger_entries_external_id'), table_name='broker_ledger_entries')
    op.drop_index(op.f('ix_broker_ledger_entries_broker_id'), table_name='broker_ledger_entries')
    op.drop_index(op.f('ix_broker_ledger_entries_account_id'), table_name='broker_ledger_entries')
    op.drop_index(op.f('ix_broker_ledger_entries_user_id'), table_name='broker_ledger_entries')
    op.drop_table('broker_ledger_entries')
