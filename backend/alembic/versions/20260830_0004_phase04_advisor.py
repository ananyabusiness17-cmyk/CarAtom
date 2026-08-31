"""Phase 04 advisor cases, repair categories, estimate revision metadata.

Revision ID: 0004_phase04_advisor
Revises: 0003_phase03_job_booking
Create Date: 2026-08-30
"""

from typing import Sequence, Union

from alembic import op

revision: str = "0004_phase04_advisor"
down_revision: Union[str, None] = "0003_phase03_job_booking"
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
)

ADVISOR_STATUSES = (
    "NOT_REQUIRED",
    "OPEN",
    "CONTACTING",
    "CUSTOMER_REACHED",
    "CHANGES_PROPOSED",
    "CUSTOMER_CONFIRMATION_DUE",
    "CONFIRMED",
    "UNREACHABLE",
    "DECLINED",
    "CANCELLED",
)


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE repair_categories (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          slug TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 0
        )
        """
    )
    op.execute("ALTER TABLE repair_offerings ADD COLUMN IF NOT EXISTS category_id UUID")
    op.execute("ALTER TABLE repair_offerings ADD COLUMN IF NOT EXISTS icon_key TEXT")
    op.execute(
        "ALTER TABLE repair_offerings ADD COLUMN IF NOT EXISTS dev_fixture BOOLEAN NOT NULL DEFAULT false"
    )
    op.execute(
        """
        ALTER TABLE repair_offerings
          ADD CONSTRAINT repair_offerings_category_id_fkey
          FOREIGN KEY (category_id) REFERENCES repair_categories(id)
        """
    )

    op.execute("ALTER TABLE job_cards DROP CONSTRAINT IF EXISTS job_cards_status_check")
    op.execute(
        "ALTER TABLE job_cards ADD CONSTRAINT job_cards_status_check CHECK (status IN ("
        + ",".join(f"'{s}'" for s in JOB_CARD_STATUSES)
        + "))"
    )

    op.execute(
        """
        ALTER TABLE job_card_items
          ADD CONSTRAINT job_card_items_repair_offering_id_fkey
          FOREIGN KEY (repair_offering_id) REFERENCES repair_offerings(id)
        """
    )

    op.execute("ALTER TABLE estimate_line_items ADD COLUMN IF NOT EXISTS was_amount_minor INTEGER")
    op.execute("ALTER TABLE estimate_line_items ADD COLUMN IF NOT EXISTS change_type TEXT")
    op.execute("ALTER TABLE estimate_line_items ADD COLUMN IF NOT EXISTS repair_offering_slug TEXT")

    op.execute(
        f"""
        CREATE TABLE advisor_cases (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          job_card_id UUID NOT NULL UNIQUE REFERENCES job_cards(id) ON DELETE RESTRICT,
          status TEXT NOT NULL DEFAULT 'OPEN'
            CHECK (status IN ({",".join(repr(s) for s in ADVISOR_STATUSES)})),
          assigned_admin_id UUID REFERENCES profiles(id),
          verified_phone_e164 TEXT,
          attempt_count INTEGER NOT NULL DEFAULT 0,
          next_attempt_at TIMESTAMPTZ,
          last_contact_at TIMESTAMPTZ,
          customer_response TEXT,
          confirmed_estimate_id UUID REFERENCES estimates(id),
          pending_estimate_id UUID REFERENCES estimates(id),
          resolution_reason TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute("CREATE INDEX idx_advisor_cases_status ON advisor_cases(status)")
    op.execute(
        """
        CREATE INDEX idx_advisor_cases_assigned
          ON advisor_cases(assigned_admin_id)
          WHERE status IN ('OPEN','CONTACTING')
        """
    )

    op.execute(
        """
        CREATE TABLE advisor_call_attempts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          advisor_case_id UUID NOT NULL REFERENCES advisor_cases(id) ON DELETE CASCADE,
          channel TEXT NOT NULL DEFAULT 'phone',
          started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          ended_at TIMESTAMPTZ,
          outcome TEXT,
          notes TEXT,
          actor_id UUID REFERENCES profiles(id),
          callback_requested BOOLEAN NOT NULL DEFAULT false
        )
        """
    )
    op.execute(
        "CREATE INDEX idx_advisor_call_attempts_case ON advisor_call_attempts(advisor_case_id)"
    )

    op.execute(
        """
        CREATE TABLE advisor_notes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          advisor_case_id UUID NOT NULL REFERENCES advisor_cases(id) ON DELETE CASCADE,
          body TEXT NOT NULL,
          author_id UUID NOT NULL REFERENCES profiles(id),
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          is_internal BOOLEAN NOT NULL DEFAULT true
        )
        """
    )

    op.execute(
        """
        CREATE TABLE estimate_rejections (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          estimate_id UUID NOT NULL REFERENCES estimates(id),
          job_card_id UUID NOT NULL REFERENCES job_cards(id),
          rejected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          reason TEXT,
          profile_id UUID NOT NULL REFERENCES profiles(id)
        )
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS estimate_rejections")
    op.execute("DROP TABLE IF EXISTS advisor_notes")
    op.execute("DROP TABLE IF EXISTS advisor_call_attempts")
    op.execute("DROP INDEX IF EXISTS idx_advisor_cases_assigned")
    op.execute("DROP INDEX IF EXISTS idx_advisor_cases_status")
    op.execute("DROP TABLE IF EXISTS advisor_cases")
    op.execute("ALTER TABLE estimate_line_items DROP COLUMN IF EXISTS repair_offering_slug")
    op.execute("ALTER TABLE estimate_line_items DROP COLUMN IF EXISTS change_type")
    op.execute("ALTER TABLE estimate_line_items DROP COLUMN IF EXISTS was_amount_minor")
    op.execute(
        "ALTER TABLE job_card_items DROP CONSTRAINT IF EXISTS job_card_items_repair_offering_id_fkey"
    )
    op.execute(
        "ALTER TABLE repair_offerings DROP CONSTRAINT IF EXISTS repair_offerings_category_id_fkey"
    )
    op.execute("ALTER TABLE repair_offerings DROP COLUMN IF EXISTS dev_fixture")
    op.execute("ALTER TABLE repair_offerings DROP COLUMN IF EXISTS icon_key")
    op.execute("ALTER TABLE repair_offerings DROP COLUMN IF EXISTS category_id")
    op.execute("DROP TABLE IF EXISTS repair_categories")
    op.execute("ALTER TABLE job_cards DROP CONSTRAINT IF EXISTS job_cards_status_check")
    op.execute(
        """
        ALTER TABLE job_cards ADD CONSTRAINT job_cards_status_check CHECK (status IN (
          'EDITABLE','PRICING','PRICING_FAILED','ESTIMATE_READY','ESTIMATE_ACCEPTED',
          'ADVISOR_REQUIRED','ADVISOR_IN_PROGRESS','SCOPE_CONFIRMED',
          'READY_FOR_FINALIZATION','FINALIZATION_IN_PROGRESS','READY_TO_BOOK',
          'BOOKING_CREATED','IN_SERVICE','COMPLETED','ABANDONED','CANCELLED'
        ))
        """
    )
