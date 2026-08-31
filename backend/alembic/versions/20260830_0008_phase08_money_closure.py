"""Phase 08 invoices, payments enrichment, reviews, notifications.

Revision ID: 0008_phase08_money_closure
Revises: 0007_phase07_inspection_repair
Create Date: 2026-08-30
"""

from typing import Sequence, Union

from alembic import op

revision: str = "0008_phase08_money_closure"
down_revision: Union[str, None] = "0007_phase07_inspection_repair"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

INVOICE_STATUSES = ("DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "VOID")
INVOICE_LINE_KINDS = ("SERVICE", "PART", "LABOUR", "FEE", "DISCOUNT", "TAX")
PAYMENT_PURPOSES = ("PARTS_ADVANCE", "FULL", "BALANCE")
PAYMENT_STATUSES = (
    "CREATED",
    "PENDING",
    "AUTHORIZED",
    "CAPTURED",
    "FAILED",
    "CANCELLED",
    "REFUNDED",
)
REFUND_STATUSES = ("REQUESTED", "COMPLETED", "FAILED")
NOTIFICATION_KINDS = (
    "BOOKING",
    "ESTIMATE",
    "ADVISOR",
    "PAYMENT",
    "VISIT",
    "REVIEW_PROMPT",
)


def upgrade() -> None:
    op.execute("CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 42")

    op.execute(
        f"""
        CREATE TABLE IF NOT EXISTS invoices (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          booking_id UUID NOT NULL REFERENCES bookings(id),
          invoice_number TEXT NOT NULL UNIQUE,
          status TEXT NOT NULL DEFAULT 'DRAFT'
            CHECK (status IN ({",".join(repr(s) for s in INVOICE_STATUSES)})),
          currency CHAR(3) NOT NULL DEFAULT 'INR',
          subtotal_minor BIGINT NOT NULL DEFAULT 0,
          tax_minor BIGINT NOT NULL DEFAULT 0,
          total_minor BIGINT NOT NULL DEFAULT 0,
          paid_minor BIGINT NOT NULL DEFAULT 0,
          balance_minor BIGINT NOT NULL DEFAULT 0,
          issued_at TIMESTAMPTZ,
          pdf_storage_path TEXT,
          version INTEGER NOT NULL DEFAULT 1,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          CONSTRAINT invoices_balance_non_negative CHECK (balance_minor >= 0)
        )
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS invoices_one_active_per_booking
          ON invoices(booking_id) WHERE status <> 'VOID'
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS invoices_booking_id_idx ON invoices(booking_id)")

    op.execute(
        f"""
        CREATE TABLE IF NOT EXISTS invoice_line_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
          sort_order INTEGER NOT NULL DEFAULT 0,
          kind TEXT NOT NULL
            CHECK (kind IN ({",".join(repr(s) for s in INVOICE_LINE_KINDS)})),
          label TEXT NOT NULL,
          quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
          unit_price_minor BIGINT NOT NULL DEFAULT 0,
          amount_minor BIGINT NOT NULL,
          metadata JSONB
        )
        """
    )

    op.execute("ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_purpose_check")
    op.execute("ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check")
    op.execute(
        "ALTER TABLE payments ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id)"
    )
    op.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS idempotency_key TEXT")
    op.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ")
    op.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS captured_at TIMESTAMPTZ")
    op.execute("ALTER TABLE payments ADD COLUMN IF NOT EXISTS failure_reason TEXT")
    op.execute(
        "ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'RAZORPAY'"
    )
    op.execute(
        "ALTER TABLE payments ADD CONSTRAINT payments_purpose_check CHECK "
        f"(purpose IN ({','.join(repr(s) for s in PAYMENT_PURPOSES)}))"
    )
    op.execute(
        "ALTER TABLE payments ADD CONSTRAINT payments_status_check CHECK "
        f"(status IN ({','.join(repr(s) for s in PAYMENT_STATUSES)}))"
    )
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS payments_idempotency_key_uidx "
        "ON payments(idempotency_key) WHERE idempotency_key IS NOT NULL"
    )
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS payments_one_pending_per_invoice_purpose
          ON payments (invoice_id, purpose)
          WHERE invoice_id IS NOT NULL
            AND status IN ('CREATED', 'PENDING', 'AUTHORIZED')
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS payments_invoice_id_idx ON payments(invoice_id)")
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_order_id_idx "
        "ON payments(razorpay_order_id) WHERE razorpay_order_id IS NOT NULL"
    )

    op.execute("ALTER TABLE payment_events ALTER COLUMN payment_id DROP NOT NULL")
    op.execute("ALTER TABLE payment_events ADD COLUMN IF NOT EXISTS signature_valid BOOLEAN")
    op.execute("ALTER TABLE payment_events ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ")
    op.execute("ALTER TABLE payment_events ADD COLUMN IF NOT EXISTS processing_result TEXT")
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS payment_events_provider_event_id_uidx
          ON payment_events(provider_event_id) WHERE provider_event_id IS NOT NULL
        """
    )

    op.execute(
        f"""
        CREATE TABLE IF NOT EXISTS refunds (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          payment_id UUID NOT NULL REFERENCES payments(id),
          amount_minor BIGINT NOT NULL,
          status TEXT NOT NULL DEFAULT 'REQUESTED'
            CHECK (status IN ({",".join(repr(s) for s in REFUND_STATUSES)})),
          provider_refund_id TEXT UNIQUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS reviews (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          booking_id UUID NOT NULL REFERENCES bookings(id) UNIQUE,
          profile_id UUID NOT NULL REFERENCES profiles(id),
          rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
          comment TEXT,
          submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          CONSTRAINT reviews_comment_len CHECK (comment IS NULL OR char_length(comment) <= 2000)
        )
        """
    )

    op.execute(
        f"""
        CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          profile_id UUID NOT NULL REFERENCES profiles(id),
          kind TEXT NOT NULL
            CHECK (kind IN ({",".join(repr(s) for s in NOTIFICATION_KINDS)})),
          title TEXT NOT NULL,
          body TEXT NOT NULL,
          deep_link TEXT,
          resource_type TEXT,
          resource_id UUID,
          read_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS notifications_profile_created_idx
          ON notifications(profile_id, created_at DESC)
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS notifications_profile_created_idx")
    op.execute("DROP TABLE IF EXISTS notifications")
    op.execute("DROP TABLE IF EXISTS reviews")
    op.execute("DROP TABLE IF EXISTS refunds")
    op.execute("DROP INDEX IF EXISTS payment_events_provider_event_id_uidx")
    op.execute("ALTER TABLE payment_events DROP COLUMN IF EXISTS processing_result")
    op.execute("ALTER TABLE payment_events DROP COLUMN IF EXISTS processed_at")
    op.execute("ALTER TABLE payment_events DROP COLUMN IF EXISTS signature_valid")
    op.execute("DROP INDEX IF EXISTS payments_provider_order_id_idx")
    op.execute("DROP INDEX IF EXISTS payments_invoice_id_idx")
    op.execute("DROP INDEX IF EXISTS payments_one_pending_per_invoice_purpose")
    op.execute("DROP INDEX IF EXISTS payments_idempotency_key_uidx")
    op.execute("ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check")
    op.execute("ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_purpose_check")
    op.execute("ALTER TABLE payments DROP COLUMN IF EXISTS provider")
    op.execute("ALTER TABLE payments DROP COLUMN IF EXISTS failure_reason")
    op.execute("ALTER TABLE payments DROP COLUMN IF EXISTS captured_at")
    op.execute("ALTER TABLE payments DROP COLUMN IF EXISTS expires_at")
    op.execute("ALTER TABLE payments DROP COLUMN IF EXISTS idempotency_key")
    op.execute("ALTER TABLE payments DROP COLUMN IF EXISTS invoice_id")
    op.execute("DROP TABLE IF EXISTS invoice_line_items")
    op.execute("DROP INDEX IF EXISTS invoices_booking_id_idx")
    op.execute("DROP INDEX IF EXISTS invoices_one_active_per_booking")
    op.execute("DROP TABLE IF EXISTS invoices")
    op.execute("DROP SEQUENCE IF EXISTS invoice_number_seq")
