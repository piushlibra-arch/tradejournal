"""add broker_connections table

Revision ID: e738b5f39a01
Revises: c92a10e8541b
Create Date: 2026-10-25 14:09:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e738b5f39a01'
down_revision: Union[str, Sequence[str], None] = 'c92a10e8541b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'broker_connections',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('account_id', sa.UUID(), nullable=True),
        sa.Column('broker_id', sa.String(length=50), nullable=False, server_default='dhan'),
        sa.Column('client_id', sa.String(length=100), nullable=False),
        sa.Column('encrypted_access_token', sa.Text(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('last_sync_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('sync_status', sa.String(length=20), nullable=False, server_default='idle'),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['account_id'], ['trading_accounts.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_broker_connections_user_id'), 'broker_connections', ['user_id'], unique=False)
    op.create_index(op.f('ix_broker_connections_account_id'), 'broker_connections', ['account_id'], unique=False)
    op.create_index(op.f('ix_broker_connections_broker_id'), 'broker_connections', ['broker_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_broker_connections_broker_id'), table_name='broker_connections')
    op.drop_index(op.f('ix_broker_connections_account_id'), table_name='broker_connections')
    op.drop_index(op.f('ix_broker_connections_user_id'), table_name='broker_connections')
    op.drop_table('broker_connections')
