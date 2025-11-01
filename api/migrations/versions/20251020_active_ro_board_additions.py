"""active ro board additions

Revision ID: a4b1f3c2d9e0
Revises: fec0b08a119e
Create Date: 2025-10-20 19:30:00

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "a4b1f3c2d9e0"
down_revision: Union[str, None] = "fec0b08a119e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1) Status meta table for badges/filters
    op.create_table(
        "ro_statuses",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("status_code", sa.String(length=64), nullable=False, unique=True, index=True),
        sa.Column("label", sa.String(length=128), nullable=False),
        sa.Column(
            "role_owner", sa.String(length=32), nullable=False
        ),  # technician|advisor|parts|foreman
        sa.Column("color", sa.String(length=32), nullable=False),  # e.g., blue|purple
    )

    # 2) Minimal extra fields on repair_orders for board behavior
    op.add_column("repair_orders", sa.Column("updated_at", sa.DateTime(), nullable=True))
    op.add_column(
        "repair_orders",
        sa.Column("is_waiter", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )

    # backfill updated_at from opened_at to keep NOT NULL invariant
    op.execute("UPDATE repair_orders SET updated_at = COALESCE(updated_at, opened_at)")
    op.alter_column("repair_orders", "updated_at", nullable=False)

    # helpful indexes
    op.create_index("ix_repair_orders_updated_at", "repair_orders", ["updated_at"], unique=False)
    # ensure status index exists (safe to try-create via Alembic; name differs from earlier)
    try:
        op.create_index("ix_repair_orders_status_str", "repair_orders", ["status"], unique=False)
    except Exception:
        pass


def downgrade() -> None:
    op.drop_index("ix_repair_orders_updated_at", table_name="repair_orders")
    try:
        op.drop_index("ix_repair_orders_status_str", table_name="repair_orders")
    except Exception:
        pass
    op.drop_column("repair_orders", "is_waiter")
    op.drop_column("repair_orders", "updated_at")
    op.drop_table("ro_statuses")
