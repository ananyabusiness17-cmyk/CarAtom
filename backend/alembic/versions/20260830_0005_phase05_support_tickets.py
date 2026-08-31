"""Phase 05 support tickets for SOS roadside.

Revision ID: 0005_phase05_support_tickets
Revises: 0004_phase04_advisor
Create Date: 2026-08-30
"""

from typing import Sequence, Union

from alembic import op

revision: str = "0005_phase05_support_tickets"
down_revision: Union[str, None] = "0004_phase04_advisor"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TICKET_TYPES = ("ROADSIDE", "GENERAL", "BILLING")
TICKET_STATUSES = ("CREATED", "OPS_NOTIFIED", "DISPATCHED_STUB", "CLOSED", "CANCELLED")
TICKET_PRIORITIES = ("LOW", "NORMAL", "HIGH", "EMERGENCY")


def upgrade() -> None:
    op.execute("CREATE SEQUENCE IF NOT EXISTS support_ticket_ref_seq START 7001")
    op.execute(
        f"""
        CREATE TABLE support_tickets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
          ticket_type TEXT NOT NULL DEFAULT 'ROADSIDE'
            CHECK (ticket_type IN ({",".join(repr(s) for s in TICKET_TYPES)})),
          status TEXT NOT NULL DEFAULT 'CREATED'
            CHECK (status IN ({",".join(repr(s) for s in TICKET_STATUSES)})),
          priority TEXT NOT NULL DEFAULT 'EMERGENCY'
            CHECK (priority IN ({",".join(repr(s) for s in TICKET_PRIORITIES)})),
          issue_code TEXT NOT NULL,
          issue_label TEXT NOT NULL,
          latitude DOUBLE PRECISION,
          longitude DOUBLE PRECISION,
          location_label TEXT,
          booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
          public_ref TEXT UNIQUE,
          ops_notes TEXT,
          dispatched_partner_label TEXT,
          eta_minutes INTEGER,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          closed_at TIMESTAMPTZ
        )
        """
    )
    op.execute(
        """
        CREATE INDEX idx_support_tickets_profile
          ON support_tickets(profile_id, created_at DESC)
        """
    )
    op.execute(
        """
        CREATE INDEX idx_support_tickets_status
          ON support_tickets(status)
          WHERE status NOT IN ('CLOSED', 'CANCELLED')
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS support_tickets")
    op.execute("DROP SEQUENCE IF EXISTS support_ticket_ref_seq")
