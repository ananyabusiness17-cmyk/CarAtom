"""Phase 06 technicians, visits, field work, media, outbox.

Revision ID: 0006_phase06_technicians_visits
Revises: 0005_phase05_support_tickets
Create Date: 2026-08-30
"""

from typing import Sequence, Union

from alembic import op

revision: str = "0006_phase06_technicians_visits"
down_revision: Union[str, None] = "0005_phase05_support_tickets"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

VISIT_TYPES = ("INSPECTION", "SERVICE", "ONE_MAN", "SOS_ASSIST")
VISIT_STATUSES = (
    "SCHEDULED",
    "ASSIGNED",
    "EN_ROUTE",
    "LATE",
    "ON_SITE",
    "INSPECTION_IN_PROGRESS",
    "INSPECTION_SUBMITTED",
    "SERVICE_IN_PROGRESS",
    "QC_PENDING",
    "QC_FAILED",
    "COMPLETED",
    "CANCELLED",
    "UNASSIGNED",
    "SUPPORT_REQUIRED",
    "FOLLOW_UP_REQUIRED",
)
MEDIA_STATUSES = ("pending", "ready", "failed")
FINDING_SEVERITIES = ("low", "medium", "high")
TECH_STATUSES = ("active", "disabled")


def upgrade() -> None:
    op.execute("CREATE SEQUENCE IF NOT EXISTS visit_ref_seq START 1042")
    op.execute(
        """
        ALTER TABLE idempotency_keys
          ADD COLUMN IF NOT EXISTS request_hash TEXT
        """
    )
    op.execute(
        f"""
        CREATE TABLE technicians (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id),
          employee_code TEXT UNIQUE,
          display_name TEXT NOT NULL,
          on_duty BOOLEAN NOT NULL DEFAULT false,
          status TEXT NOT NULL DEFAULT 'active'
            CHECK (status IN ({",".join(repr(s) for s in TECH_STATUSES)})),
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        """
        CREATE TABLE technician_skills (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          technician_id UUID NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
          skill_code TEXT NOT NULL,
          UNIQUE (technician_id, skill_code)
        )
        """
    )
    op.execute(
        f"""
        CREATE TABLE visits (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          public_ref TEXT UNIQUE NOT NULL,
          booking_id UUID NOT NULL REFERENCES bookings(id),
          job_card_id UUID NOT NULL REFERENCES job_cards(id),
          visit_type TEXT NOT NULL
            CHECK (visit_type IN ({",".join(repr(s) for s in VISIT_TYPES)})),
          status TEXT NOT NULL DEFAULT 'SCHEDULED'
            CHECK (status IN ({",".join(repr(s) for s in VISIT_STATUSES)})),
          scheduled_start_at TIMESTAMPTZ NOT NULL,
          scheduled_end_at TIMESTAMPTZ NOT NULL,
          timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
          version INT NOT NULL DEFAULT 1,
          scope_lines JSONB NOT NULL DEFAULT '[]'::jsonb,
          advisor_note TEXT,
          parking_notes TEXT,
          distance_km DOUBLE PRECISION,
          display_type_label TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        """
        CREATE TABLE technician_assignments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
          technician_id UUID NOT NULL REFERENCES technicians(id),
          assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          unassigned_at TIMESTAMPTZ,
          is_current BOOLEAN NOT NULL DEFAULT true
        )
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX one_current_assignment_per_visit
          ON technician_assignments (visit_id) WHERE is_current = true
        """
    )
    op.execute(
        """
        CREATE TABLE technician_location_pings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          technician_id UUID NOT NULL REFERENCES technicians(id),
          visit_id UUID REFERENCES visits(id),
          lat DOUBLE PRECISION NOT NULL,
          lng DOUBLE PRECISION NOT NULL,
          accuracy_m DOUBLE PRECISION,
          recorded_at TIMESTAMPTZ NOT NULL,
          client_event_id UUID UNIQUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        """
        CREATE TABLE inspections (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          visit_id UUID NOT NULL UNIQUE REFERENCES visits(id),
          status TEXT NOT NULL DEFAULT 'draft',
          submitted_at TIMESTAMPTZ
        )
        """
    )
    op.execute(
        f"""
        CREATE TABLE inspection_findings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
          summary TEXT NOT NULL,
          recommendation TEXT,
          severity TEXT CHECK (severity IN ({",".join(repr(s) for s in FINDING_SEVERITIES)})),
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        f"""
        CREATE TABLE media_assets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          visit_id UUID NOT NULL REFERENCES visits(id),
          uploader_profile_id UUID NOT NULL REFERENCES profiles(id),
          storage_path TEXT NOT NULL,
          content_type TEXT NOT NULL,
          byte_size INT,
          sha256 TEXT,
          status TEXT NOT NULL DEFAULT 'pending'
            CHECK (status IN ({",".join(repr(s) for s in MEDIA_STATUSES)})),
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        """
        CREATE TABLE job_parts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          visit_id UUID NOT NULL REFERENCES visits(id),
          job_card_id UUID NOT NULL REFERENCES job_cards(id),
          sku_code TEXT NOT NULL,
          label TEXT NOT NULL,
          quantity NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
          notes TEXT,
          fitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          client_event_id UUID UNIQUE
        )
        """
    )
    op.execute(
        """
        CREATE TABLE job_labour (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          visit_id UUID NOT NULL REFERENCES visits(id),
          job_card_id UUID NOT NULL REFERENCES job_cards(id),
          description TEXT NOT NULL,
          minutes INT,
          client_event_id UUID UNIQUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        """
        CREATE TABLE qc_checks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          visit_id UUID NOT NULL REFERENCES visits(id),
          checklist_version TEXT NOT NULL DEFAULT 'v1',
          items JSONB NOT NULL,
          passed BOOLEAN NOT NULL,
          submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          client_event_id UUID UNIQUE
        )
        """
    )
    op.execute(
        """
        CREATE TABLE outbox_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          event_type TEXT NOT NULL,
          payload JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          processed_at TIMESTAMPTZ
        )
        """
    )
    op.execute("CREATE INDEX visits_scheduled_start_idx ON visits (scheduled_start_at)")
    op.execute("CREATE INDEX visits_status_idx ON visits (status)")
    op.execute(
        """
        CREATE INDEX technician_assignments_technician_idx
          ON technician_assignments (technician_id) WHERE is_current
        """
    )
    op.execute(
        """
        CREATE INDEX location_pings_technician_time_idx
          ON technician_location_pings (technician_id, recorded_at DESC)
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS outbox_events")
    op.execute("DROP TABLE IF EXISTS qc_checks")
    op.execute("DROP TABLE IF EXISTS job_labour")
    op.execute("DROP TABLE IF EXISTS job_parts")
    op.execute("DROP TABLE IF EXISTS media_assets")
    op.execute("DROP TABLE IF EXISTS inspection_findings")
    op.execute("DROP TABLE IF EXISTS inspections")
    op.execute("DROP TABLE IF EXISTS technician_location_pings")
    op.execute("DROP TABLE IF EXISTS technician_assignments")
    op.execute("DROP TABLE IF EXISTS visits")
    op.execute("DROP TABLE IF EXISTS technician_skills")
    op.execute("DROP TABLE IF EXISTS technicians")
    op.execute("DROP SEQUENCE IF EXISTS visit_ref_seq")
    op.execute("ALTER TABLE idempotency_keys DROP COLUMN IF EXISTS request_hash")
