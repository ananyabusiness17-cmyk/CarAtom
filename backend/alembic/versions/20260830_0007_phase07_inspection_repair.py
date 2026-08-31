"""Phase 07 inspection + repair two-visit loop.

Revision ID: 0007_phase07_inspection_repair
Revises: 0006_phase06_technicians_visits
Create Date: 2026-08-30
"""

from typing import Sequence, Union

from alembic import op

revision: str = "0007_phase07_inspection_repair"
down_revision: Union[str, None] = "0006_phase06_technicians_visits"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

JOB_CARD_STATUSES = (
    "EDITABLE",
    "PRICING",
    "PRICING_FAILED",
    "ESTIMATE_READY",
    "ESTIMATE_ACCEPTED",
    "ADVISOR_REQUIRED",
    "ADVISOR_IN_PROGRESS",
    "REVISED_ESTIMATE_PENDING",
    "SCOPE_CONFIRMED",
    "READY_FOR_FINALIZATION",
    "FINALIZATION_IN_PROGRESS",
    "READY_TO_BOOK",
    "BOOKING_CREATED",
    "IN_SERVICE",
    "COMPLETED",
    "ABANDONED",
    "CANCELLED",
    "INSPECTION_BOOKED",
    "INSPECTION_IN_PROGRESS",
    "ESTIMATE_PENDING",
    "REPAIR_APPROVAL_DUE",
    "PARTS_ADVANCE_DUE",
    "PARTS_PENDING",
    "REPAIR_BOOKING_REQUIRED",
    "REPAIR_BOOKED",
    "REPAIR_IN_PROGRESS",
)

VISIT_TYPES = ("INSPECTION", "SERVICE", "ONE_MAN", "SOS_ASSIST", "REPAIR")
READINESS = ("RECOMMENDED", "ORDERED", "IN_TRANSIT", "READY", "FITTED", "CANCELLED")
ESTIMATE_SOURCES = ("system", "advisor", "admin", "inspection")
PAYMENT_PURPOSES = ("PARTS_ADVANCE",)
PAYMENT_STATUSES = ("CREATED", "AUTHORIZED", "CAPTURED", "FAILED", "REFUNDED")
ALLOCATION_STATUSES = ("DUE", "CAPTURED", "REFUND_PENDING", "REFUNDED")
FINDING_SEVERITIES = ("LOW", "MEDIUM", "HIGH", "CRITICAL", "low", "medium", "high")


def upgrade() -> None:
    op.execute("ALTER TABLE job_cards DROP CONSTRAINT IF EXISTS job_cards_status_check")
    op.execute(
        "ALTER TABLE job_cards ADD CONSTRAINT job_cards_status_check CHECK (status IN ("
        + ",".join(f"'{s}'" for s in JOB_CARD_STATUSES)
        + "))"
    )
    op.execute(
        """
        ALTER TABLE job_cards
          ADD COLUMN IF NOT EXISTS inspection_visit_id UUID REFERENCES visits(id)
        """
    )
    op.execute(
        """
        ALTER TABLE job_cards
          ADD COLUMN IF NOT EXISTS repair_visit_id UUID REFERENCES visits(id)
        """
    )
    op.execute(
        """
        ALTER TABLE job_cards
          ADD COLUMN IF NOT EXISTS accepted_inspection_estimate_id UUID REFERENCES estimates(id)
        """
    )

    op.execute("ALTER TABLE visits DROP CONSTRAINT IF EXISTS visits_visit_type_check")
    op.execute(
        "ALTER TABLE visits ADD CONSTRAINT visits_visit_type_check CHECK (visit_type IN ("
        + ",".join(f"'{s}'" for s in VISIT_TYPES)
        + "))"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_visits_job_card_type ON visits(job_card_id, visit_type)"
    )

    op.execute(
        """
        ALTER TABLE inspections
          ADD COLUMN IF NOT EXISTS job_card_id UUID REFERENCES job_cards(id)
        """
    )
    op.execute(
        """
        ALTER TABLE inspections
          ADD COLUMN IF NOT EXISTS summary TEXT
        """
    )
    op.execute(
        """
        ALTER TABLE inspections
          ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES profiles(id)
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS idx_inspections_job_card ON inspections(job_card_id)")

    op.execute(
        """
        ALTER TABLE inspection_findings
          ADD COLUMN IF NOT EXISTS job_card_id UUID REFERENCES job_cards(id)
        """
    )
    op.execute("ALTER TABLE inspection_findings ADD COLUMN IF NOT EXISTS title TEXT")
    op.execute("ALTER TABLE inspection_findings ADD COLUMN IF NOT EXISTS customer_explanation TEXT")
    op.execute("ALTER TABLE inspection_findings ADD COLUMN IF NOT EXISTS repair_category TEXT")
    op.execute(
        "ALTER TABLE inspection_findings ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0"
    )
    op.execute(
        """
        ALTER TABLE inspection_findings
          ADD COLUMN IF NOT EXISTS media_asset_id UUID REFERENCES media_assets(id)
        """
    )
    op.execute("UPDATE inspection_findings SET title = summary WHERE title IS NULL")
    op.execute(
        """
        UPDATE inspection_findings
           SET customer_explanation = summary
         WHERE customer_explanation IS NULL
        """
    )
    op.execute(
        "ALTER TABLE inspection_findings DROP CONSTRAINT IF EXISTS inspection_findings_severity_check"
    )
    op.execute(
        "ALTER TABLE inspection_findings ADD CONSTRAINT inspection_findings_severity_check "
        "CHECK (severity IS NULL OR severity IN ("
        + ",".join(f"'{s}'" for s in FINDING_SEVERITIES)
        + "))"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_findings_inspection ON inspection_findings(inspection_id)"
    )

    op.execute(
        """
        ALTER TABLE job_parts
          ADD COLUMN IF NOT EXISTS readiness_status TEXT NOT NULL DEFAULT 'FITTED'
        """
    )
    op.execute("ALTER TABLE job_parts DROP CONSTRAINT IF EXISTS job_parts_readiness_status_check")
    op.execute(
        "ALTER TABLE job_parts ADD CONSTRAINT job_parts_readiness_status_check CHECK "
        "(readiness_status IN (" + ",".join(f"'{s}'" for s in READINESS) + "))"
    )
    op.execute("ALTER TABLE job_parts ADD COLUMN IF NOT EXISTS ordered_at TIMESTAMPTZ")
    op.execute("ALTER TABLE job_parts ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ")
    op.execute("ALTER TABLE job_parts ALTER COLUMN fitted_at DROP NOT NULL")
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_job_parts_job_card_readiness
          ON job_parts(job_card_id, readiness_status)
        """
    )

    op.execute(
        "ALTER TABLE estimates ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'system'"
    )
    op.execute("ALTER TABLE estimates DROP CONSTRAINT IF EXISTS estimates_source_check")
    op.execute(
        "ALTER TABLE estimates ADD CONSTRAINT estimates_source_check CHECK (source IN ("
        + ",".join(f"'{s}'" for s in ESTIMATE_SOURCES)
        + "))"
    )
    op.execute("ALTER TABLE estimates ADD COLUMN IF NOT EXISTS parts_advance_amount_minor BIGINT")

    op.execute(
        """
        ALTER TABLE pricing_policies
          ADD COLUMN IF NOT EXISTS parts_advance_percent INTEGER NOT NULL DEFAULT 60
        """
    )
    op.execute(
        """
        ALTER TABLE pricing_policies
          ADD COLUMN IF NOT EXISTS inspection_fee_minor INTEGER NOT NULL DEFAULT 49900
        """
    )

    op.execute("ALTER TABLE media_assets ALTER COLUMN visit_id DROP NOT NULL")
    op.execute(
        """
        ALTER TABLE media_assets
          ADD COLUMN IF NOT EXISTS job_card_id UUID REFERENCES job_cards(id)
        """
    )

    op.execute(
        f"""
        CREATE TABLE IF NOT EXISTS payments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          job_card_id UUID NOT NULL REFERENCES job_cards(id),
          estimate_id UUID REFERENCES estimates(id),
          purpose TEXT NOT NULL
            CHECK (purpose IN ({",".join(repr(s) for s in PAYMENT_PURPOSES)})),
          status TEXT NOT NULL DEFAULT 'CREATED'
            CHECK (status IN ({",".join(repr(s) for s in PAYMENT_STATUSES)})),
          amount_minor BIGINT NOT NULL,
          currency TEXT NOT NULL DEFAULT 'INR',
          razorpay_order_id TEXT,
          razorpay_payment_id TEXT,
          provider_payload JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_razorpay_payment "
        "ON payments(razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL"
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS payment_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
          event_type TEXT NOT NULL,
          provider_event_id TEXT,
          payload JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )

    op.execute(
        f"""
        CREATE TABLE IF NOT EXISTS parts_advance_allocations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          job_card_id UUID NOT NULL REFERENCES job_cards(id),
          estimate_id UUID NOT NULL REFERENCES estimates(id),
          payment_id UUID REFERENCES payments(id),
          amount_minor BIGINT NOT NULL,
          currency TEXT NOT NULL DEFAULT 'INR',
          status TEXT NOT NULL
            CHECK (status IN ({",".join(repr(s) for s in ALLOCATION_STATUSES)})),
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS idx_parts_advance_job_estimate
          ON parts_advance_allocations(job_card_id, estimate_id)
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS parts_advance_allocations")
    op.execute("DROP TABLE IF EXISTS payment_events")
    op.execute("DROP TABLE IF EXISTS payments")
    op.execute("ALTER TABLE media_assets DROP COLUMN IF EXISTS job_card_id")
    op.execute("ALTER TABLE pricing_policies DROP COLUMN IF EXISTS inspection_fee_minor")
    op.execute("ALTER TABLE pricing_policies DROP COLUMN IF EXISTS parts_advance_percent")
    op.execute("ALTER TABLE estimates DROP COLUMN IF EXISTS parts_advance_amount_minor")
    op.execute("ALTER TABLE estimates DROP COLUMN IF EXISTS source")
    op.execute("ALTER TABLE job_parts DROP COLUMN IF EXISTS ready_at")
    op.execute("ALTER TABLE job_parts DROP COLUMN IF EXISTS ordered_at")
    op.execute("ALTER TABLE job_parts DROP COLUMN IF EXISTS readiness_status")
    op.execute("ALTER TABLE job_cards DROP COLUMN IF EXISTS accepted_inspection_estimate_id")
    op.execute("ALTER TABLE job_cards DROP COLUMN IF EXISTS repair_visit_id")
    op.execute("ALTER TABLE job_cards DROP COLUMN IF EXISTS inspection_visit_id")
