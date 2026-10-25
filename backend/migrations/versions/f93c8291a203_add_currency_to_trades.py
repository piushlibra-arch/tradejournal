"""add currency to trades

Revision ID: f93c8291a203
Revises: e82b7190c102
Create Date: 2026-10-25 15:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f93c8291a203'
down_revision: Union[str, Sequence[str], None] = 'e82b7190c102'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'trades',
        sa.Column('currency', sa.String(length=10), nullable=False, server_default='USD')
    )
    op.create_index(op.f('ix_trades_currency'), 'trades', ['currency'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_trades_currency'), table_name='trades')
    op.drop_column('trades', 'currency')
