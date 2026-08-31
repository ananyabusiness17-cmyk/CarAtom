"""Phase 03 job cards, estimates, slots, and bookings.

Revision ID: 0003_phase03_job_booking
Revises: 002_phase02_profiles_catalog
Create Date: 2026-08-29
"""

from typing import Sequence, Union

from alembic import op

revision: str = "0003_phase03_job_booking"
down_revision: Union[str, None] = "002_phase02_profiles_catalog"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE SEQUENCE job_card_ref_seq START 1050")
    op.execute("CREATE SEQUENCE booking_ref_seq START 2201")

    op.execute(
        """
        CREATE TABLE vehicles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          profile_id UUID NOT NULL REFERENCES profiles(id),
          make TEXT NOT NULL,
          model TEXT NOT NULL,
          year INTEGER NOT NULL CHECK (year >= 1990 AND year <= 2030),
          fuel_type TEXT NOT NULL CHECK (fuel_type IN ('PETROL','DIESEL','CNG','EV')),
          transmission TEXT NOT NULL CHECK (transmission IN ('MANUAL','AUTOMATIC')),
          registration_number TEXT,
          variant TEXT,
          mileage_km INTEGER,
          is_archived BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        "CREATE INDEX idx_vehicles_profile_id ON vehicles(profile_id) WHERE is_archived = FALSE"
    )

    op.execute(
        """
        CREATE TABLE addresses (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          profile_id UUID NOT NULL REFERENCES profiles(id),
          label TEXT,
          line1 TEXT NOT NULL,
          line2 TEXT,
          locality TEXT NOT NULL,
          city TEXT NOT NULL DEFAULT 'Bengaluru',
          state TEXT NOT NULL DEFAULT 'Karnataka',
          postal_code TEXT NOT NULL,
          latitude DOUBLE PRECISION,
          longitude DOUBLE PRECISION,
          is_default BOOLEAN NOT NULL DEFAULT FALSE,
          is_archived BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        "CREATE INDEX idx_addresses_profile_id ON addresses(profile_id) WHERE is_archived = FALSE"
    )

    op.execute(
        """
        CREATE TABLE service_calendars (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          slug TEXT NOT NULL UNIQUE,
          timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
          operating_start TIME NOT NULL DEFAULT '09:00',
          operating_end TIME NOT NULL DEFAULT '18:00',
          slot_capacity INTEGER NOT NULL DEFAULT 3
        )
        """
    )

    op.execute(
        """
        CREATE TABLE holidays (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          calendar_id UUID NOT NULL REFERENCES service_calendars(id),
          holiday_date DATE NOT NULL,
          reason TEXT,
          UNIQUE (calendar_id, holiday_date)
        )
        """
    )

    op.execute(
        """
        INSERT INTO service_calendars (slug, timezone, operating_start, operating_end, slot_capacity)
        VALUES ('koramangala-default', 'Asia/Kolkata', '09:00', '18:00', 3)
        """
    )

    op.execute(
        """
        CREATE TABLE job_cards (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          public_ref TEXT NOT NULL UNIQUE,
          profile_id UUID REFERENCES profiles(id),
          service_offering_id UUID NOT NULL REFERENCES service_offerings(id),
          flow_policy TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'EDITABLE'
            CHECK (status IN (
              'EDITABLE','PRICING','PRICING_FAILED','ESTIMATE_READY','ESTIMATE_ACCEPTED',
              'ADVISOR_REQUIRED','ADVISOR_IN_PROGRESS','SCOPE_CONFIRMED',
              'READY_FOR_FINALIZATION','FINALIZATION_IN_PROGRESS','READY_TO_BOOK',
              'BOOKING_CREATED','IN_SERVICE','COMPLETED','ABANDONED','CANCELLED'
            )),
          vehicle_id UUID REFERENCES vehicles(id),
          address_id UUID REFERENCES addresses(id),
          vehicle_context JSONB NOT NULL,
          service_area_id UUID REFERENCES service_area_rules(id),
          accepted_estimate_id UUID,
          idempotency_namespace TEXT,
          version INTEGER NOT NULL DEFAULT 1,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute("CREATE INDEX idx_job_cards_profile_status ON job_cards(profile_id, status)")

    op.execute(
        """
        CREATE TABLE job_card_concerns (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          job_card_id UUID NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
          text TEXT NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )

    op.execute(
        """
        CREATE TABLE job_card_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          job_card_id UUID NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
          kind TEXT NOT NULL CHECK (kind IN ('SERVICE','REPAIR')),
          service_offering_id UUID REFERENCES service_offerings(id),
          repair_offering_id UUID,
          quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
          label_snapshot TEXT NOT NULL,
          unit_price_minor INTEGER NOT NULL CHECK (unit_price_minor >= 0),
          currency TEXT NOT NULL DEFAULT 'INR',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )

    op.execute(
        """
        CREATE TABLE job_card_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          job_card_id UUID NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
          event_type TEXT NOT NULL,
          actor_profile_id UUID,
          request_id TEXT,
          payload JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )

    op.execute(
        """
        CREATE TABLE estimates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          job_card_id UUID NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
          version INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'DRAFT'
            CHECK (status IN (
              'DRAFT','READY','ACCEPTED','REJECTED','EXPIRED','SUPERSEDED','CALCULATION_FAILED'
            )),
          total_minor INTEGER NOT NULL CHECK (total_minor >= 0),
          currency TEXT NOT NULL DEFAULT 'INR',
          expires_at TIMESTAMPTZ,
          content_hash TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (job_card_id, version)
        )
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX uq_estimates_one_ready_per_job_card
          ON estimates(job_card_id) WHERE status = 'READY'
        """
    )

    op.execute(
        """
        CREATE TABLE estimate_line_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
          sort_order INTEGER NOT NULL DEFAULT 0,
          label TEXT NOT NULL,
          kind TEXT NOT NULL,
          amount_minor INTEGER NOT NULL,
          currency TEXT NOT NULL DEFAULT 'INR',
          is_included BOOLEAN NOT NULL DEFAULT FALSE
        )
        """
    )

    op.execute(
        """
        CREATE TABLE estimate_acceptances (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          estimate_id UUID NOT NULL REFERENCES estimates(id),
          job_card_id UUID NOT NULL REFERENCES job_cards(id),
          profile_id UUID REFERENCES profiles(id),
          accepted_total_minor INTEGER NOT NULL,
          idempotency_key TEXT NOT NULL UNIQUE,
          accepted_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )

    op.execute(
        """
        CREATE TABLE slot_holds (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          job_card_id UUID NOT NULL REFERENCES job_cards(id),
          profile_id UUID NOT NULL REFERENCES profiles(id),
          slot_starts_at TIMESTAMPTZ NOT NULL,
          slot_ends_at TIMESTAMPTZ NOT NULL,
          timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
          status TEXT NOT NULL DEFAULT 'ACTIVE'
            CHECK (status IN ('ACTIVE','CONSUMED','EXPIRED','RELEASED')),
          expires_at TIMESTAMPTZ NOT NULL,
          idempotency_key TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        """
        CREATE INDEX idx_slot_holds_active ON slot_holds(slot_starts_at, slot_ends_at)
          WHERE status = 'ACTIVE'
        """
    )

    op.execute(
        """
        CREATE TABLE bookings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          public_ref TEXT NOT NULL UNIQUE,
          job_card_id UUID NOT NULL REFERENCES job_cards(id),
          profile_id UUID NOT NULL REFERENCES profiles(id),
          status TEXT NOT NULL DEFAULT 'CONFIRMED'
            CHECK (status IN (
              'DRAFT','HOLDING','CONFIRMED','RESCHEDULE_REQUESTED','CANCEL_REQUESTED',
              'IN_PROGRESS','COMPLETED','CANCELLED'
            )),
          slot_starts_at TIMESTAMPTZ NOT NULL,
          slot_ends_at TIMESTAMPTZ NOT NULL,
          timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
          visit_type TEXT NOT NULL DEFAULT 'SERVICE',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )

    op.execute(
        """
        CREATE TABLE booking_snapshots (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
          customer_snapshot JSONB NOT NULL,
          address_snapshot JSONB NOT NULL,
          vehicle_snapshot JSONB NOT NULL,
          estimate_snapshot JSONB NOT NULL,
          offering_snapshot JSONB NOT NULL,
          flow_policy TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )

    op.execute(
        """
        CREATE TABLE idempotency_keys (
          key TEXT PRIMARY KEY,
          profile_id UUID,
          route TEXT NOT NULL,
          response_status INTEGER NOT NULL,
          response_body JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          expires_at TIMESTAMPTZ NOT NULL
        )
        """
    )
    op.execute("CREATE INDEX idx_idempotency_expires ON idempotency_keys(expires_at)")

    op.execute(
        """
        CREATE TABLE id_sequences (
          name TEXT PRIMARY KEY,
          value INTEGER NOT NULL
        )
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS id_sequences")
    op.execute("DROP TABLE IF EXISTS idempotency_keys")
    op.execute("DROP TABLE IF EXISTS booking_snapshots")
    op.execute("DROP TABLE IF EXISTS bookings")
    op.execute("DROP TABLE IF EXISTS slot_holds")
    op.execute("DROP TABLE IF EXISTS estimate_acceptances")
    op.execute("DROP TABLE IF EXISTS estimate_line_items")
    op.execute("DROP TABLE IF EXISTS estimates")
    op.execute("DROP TABLE IF EXISTS job_card_events")
    op.execute("DROP TABLE IF EXISTS job_card_items")
    op.execute("DROP TABLE IF EXISTS job_card_concerns")
    op.execute("DROP TABLE IF EXISTS job_cards")
    op.execute("DROP TABLE IF EXISTS holidays")
    op.execute("DROP TABLE IF EXISTS service_calendars")
    op.execute("DROP TABLE IF EXISTS addresses")
    op.execute("DROP TABLE IF EXISTS vehicles")
    op.execute("DROP SEQUENCE IF EXISTS booking_ref_seq")
    op.execute("DROP SEQUENCE IF EXISTS job_card_ref_seq")
