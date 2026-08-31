"""Phase 13 ops: kits, visit actuals, part intent, vehicle service logs.

Revision ID: 0013_ops_bring
Revises: 0010_phase11_outbox
Create Date: 2026-08-31
"""

from typing import Sequence, Union

from alembic import op

revision: str = "0013_ops_bring"
down_revision: Union[str, None] = "0010_phase11_outbox"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS catalog_kit_lines (
          id UUID PRIMARY KEY,
          owner_type TEXT NOT NULL,
          owner_id UUID NOT NULL,
          sku_id UUID REFERENCES inventory_skus(id),
          quantity INT NOT NULL DEFAULT 1,
          line_kind TEXT NOT NULL DEFAULT 'PART',
          label TEXT,
          sort_order INT NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_catalog_kit_owner ON catalog_kit_lines(owner_type, owner_id)"
    )
    op.execute(
        """
        ALTER TABLE visits
          ADD COLUMN IF NOT EXISTS actual_start_at TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS actual_finish_at TIMESTAMPTZ
        """
    )
    op.execute(
        """
        ALTER TABLE job_parts
          ADD COLUMN IF NOT EXISTS intent TEXT NOT NULL DEFAULT 'FIT'
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS vehicle_service_logs (
          id UUID PRIMARY KEY,
          vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
          visit_id UUID REFERENCES visits(id),
          offering_slug TEXT,
          invoice_total_minor INT,
          odometer_km INT,
          notes TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_vehicle_service_logs_vehicle ON vehicle_service_logs(vehicle_id, created_at DESC)"
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS vehicle_service_logs")
    op.execute("ALTER TABLE job_parts DROP COLUMN IF EXISTS intent")
    op.execute("ALTER TABLE visits DROP COLUMN IF EXISTS actual_start_at")
    op.execute("ALTER TABLE visits DROP COLUMN IF EXISTS actual_finish_at")
    op.execute("DROP TABLE IF EXISTS catalog_kit_lines")
