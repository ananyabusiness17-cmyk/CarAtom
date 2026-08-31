"""Phase 09 inventory, audit logs, catalog versions.

Revision ID: 0009_phase09_inventory_audit
Revises: 0008_phase08_money_closure
Create Date: 2026-08-30

Refunds are stored as separate refunds rows (positive amount_minor);
the admin ledger displays them as negative for ops. Not a negative
payments.amount_minor.
"""

from typing import Sequence, Union

from alembic import op

revision: str = "0009_phase09_inventory_audit"
down_revision: Union[str, None] = "0008_phase08_money_closure"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

LOCATIONS = ("WH", "VAN_A", "VAN_B", "VAN_C")
MOVEMENT_TYPES = ("RECEIVE", "CONSUME", "ADJUST", "REVERSE", "TRANSFER")


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS inventory_skus (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          sku_code TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          oem_code TEXT,
          unit TEXT NOT NULL DEFAULT 'each',
          low_stock_threshold INTEGER NOT NULL DEFAULT 5,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          metadata JSONB NOT NULL DEFAULT '{}',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_inventory_skus_active ON inventory_skus(is_active) WHERE is_active = TRUE"
    )

    loc_check = ",".join(repr(s) for s in LOCATIONS)
    op.execute(
        f"""
        CREATE TABLE IF NOT EXISTS inventory_stock (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          sku_id UUID NOT NULL REFERENCES inventory_skus(id),
          location_code TEXT NOT NULL CHECK (location_code IN ({loc_check})),
          quantity INTEGER NOT NULL CHECK (quantity >= 0),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (sku_id, location_code)
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_inventory_stock_sku ON inventory_stock(sku_id)")

    types_check = ",".join(repr(s) for s in MOVEMENT_TYPES)
    op.execute(
        f"""
        CREATE TABLE IF NOT EXISTS inventory_movements (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          sku_id UUID NOT NULL REFERENCES inventory_skus(id),
          movement_type TEXT NOT NULL CHECK (movement_type IN ({types_check})),
          location_code TEXT NOT NULL CHECK (location_code IN ({loc_check})),
          quantity INTEGER NOT NULL CHECK (quantity > 0),
          to_location_code TEXT CHECK (to_location_code IS NULL OR to_location_code IN ({loc_check})),
          job_card_id UUID REFERENCES job_cards(id),
          visit_id UUID REFERENCES visits(id),
          job_part_id UUID REFERENCES job_parts(id),
          actor_id UUID NOT NULL REFERENCES profiles(id),
          reason TEXT NOT NULL,
          reference TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_inventory_movements_job ON inventory_movements(job_card_id)"
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_inventory_movements_customer_sku
          ON inventory_movements(sku_id, created_at DESC)
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS audit_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          actor_id UUID NOT NULL REFERENCES profiles(id),
          actor_role TEXT NOT NULL,
          command TEXT NOT NULL,
          resource_type TEXT NOT NULL,
          resource_id TEXT NOT NULL,
          before_summary JSONB,
          after_summary JSONB,
          reason TEXT,
          request_id TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          CONSTRAINT audit_logs_override_reason CHECK (
            command NOT LIKE 'override.%' OR (reason IS NOT NULL AND length(trim(reason)) > 0)
          )
        )
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_audit_logs_resource
          ON audit_logs(resource_type, resource_id, created_at DESC)
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id, created_at DESC)"
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS service_offering_versions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          offering_id UUID NOT NULL REFERENCES service_offerings(id),
          version INTEGER NOT NULL,
          slug TEXT NOT NULL,
          name TEXT NOT NULL,
          display_price_minor INTEGER,
          is_active BOOLEAN NOT NULL,
          snapshot JSONB NOT NULL DEFAULT '{}',
          actor_id UUID REFERENCES profiles(id),
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (offering_id, version)
        )
        """
    )

    op.execute(
        """
        ALTER TABLE job_parts
          ADD COLUMN IF NOT EXISTS inventory_movement_id UUID REFERENCES inventory_movements(id)
        """
    )
    op.execute("ALTER TABLE technicians ADD COLUMN IF NOT EXISTS van_code TEXT")
    op.execute(
        "ALTER TABLE service_offerings ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1"
    )
    op.execute("ALTER TABLE refunds ADD COLUMN IF NOT EXISTS reason TEXT")


def downgrade() -> None:
    op.execute("ALTER TABLE refunds DROP COLUMN IF EXISTS reason")
    op.execute("ALTER TABLE service_offerings DROP COLUMN IF EXISTS version")
    op.execute("ALTER TABLE technicians DROP COLUMN IF EXISTS van_code")
    op.execute("ALTER TABLE job_parts DROP COLUMN IF EXISTS inventory_movement_id")
    op.execute("DROP TABLE IF EXISTS service_offering_versions")
    op.execute("DROP TABLE IF EXISTS audit_logs")
    op.execute("DROP TABLE IF EXISTS inventory_movements")
    op.execute("DROP TABLE IF EXISTS inventory_stock")
    op.execute("DROP TABLE IF EXISTS inventory_skus")
