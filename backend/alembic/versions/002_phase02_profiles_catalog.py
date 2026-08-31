"""Phase 02 profiles + catalog.

Revision ID: 002_phase02_profiles_catalog
Revises: 0001_baseline
Create Date: 2026-08-29

profiles.id is a UUID PK matching the JWT `sub`. There is no FK to auth.users:
local Docker Postgres has no Supabase Auth schema. Application code upserts
the row from a verified JWT.
"""

from typing import Sequence, Union

from alembic import op

revision: str = "002_phase02_profiles_catalog"
down_revision: Union[str, None] = "0001_baseline"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    op.execute(
        """
        CREATE TABLE profiles (
          id            UUID PRIMARY KEY,
          phone         TEXT,
          full_name     TEXT,
          role          TEXT NOT NULL DEFAULT 'customer'
                        CHECK (role IN ('customer', 'technician', 'admin')),
          is_active     BOOLEAN NOT NULL DEFAULT true,
          created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute("CREATE INDEX idx_profiles_phone ON profiles(phone) WHERE phone IS NOT NULL")
    op.execute("CREATE INDEX idx_profiles_role ON profiles(role)")

    op.execute(
        """
        CREATE TABLE service_categories (
          id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          slug          TEXT NOT NULL UNIQUE,
          name          TEXT NOT NULL,
          sort_order    INT NOT NULL DEFAULT 0,
          is_active     BOOLEAN NOT NULL DEFAULT true,
          created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )

    op.execute(
        """
        CREATE TABLE pricing_policies (
          id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          slug             TEXT NOT NULL UNIQUE,
          base_price_minor INT NOT NULL,
          currency         TEXT NOT NULL DEFAULT 'INR',
          tax_rate_bps     INT NOT NULL DEFAULT 1800,
          valid_from       TIMESTAMPTZ NOT NULL DEFAULT now(),
          valid_to         TIMESTAMPTZ,
          is_active        BOOLEAN NOT NULL DEFAULT true
        )
        """
    )

    op.execute(
        """
        CREATE TABLE service_offerings (
          id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          slug                TEXT NOT NULL UNIQUE,
          category_id         UUID REFERENCES service_categories(id),
          pricing_policy_id   UUID REFERENCES pricing_policies(id),
          name                TEXT NOT NULL,
          short_description   TEXT,
          flow_policy         TEXT NOT NULL
                              CHECK (flow_policy IN (
                                'GENERAL_SERVICE', 'ONE_MAN', 'DIRECT_SPECIAL', 'INSPECTION_REPAIR'
                              )),
          display_price_minor INT,
          currency            TEXT NOT NULL DEFAULT 'INR',
          duration_minutes    INT,
          sort_order          INT NOT NULL DEFAULT 0,
          is_active           BOOLEAN NOT NULL DEFAULT true,
          hero_media_url      TEXT,
          icon_key            TEXT,
          disclosures         JSONB,
          media               JSONB,
          dev_fixture         BOOLEAN NOT NULL DEFAULT false,
          created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        "CREATE INDEX idx_offerings_policy ON service_offerings(flow_policy) WHERE is_active"
    )
    op.execute(
        "CREATE INDEX idx_offerings_category ON service_offerings(category_id) WHERE is_active"
    )

    op.execute(
        """
        CREATE TABLE included_service_items (
          id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          offering_id     UUID NOT NULL REFERENCES service_offerings(id) ON DELETE CASCADE,
          label           TEXT NOT NULL,
          sort_order      INT NOT NULL DEFAULT 0,
          is_active       BOOLEAN NOT NULL DEFAULT true
        )
        """
    )

    op.execute(
        """
        CREATE TABLE service_area_rules (
          id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          slug            TEXT NOT NULL UNIQUE,
          name            TEXT NOT NULL,
          city            TEXT NOT NULL,
          locality        TEXT,
          postal_prefixes JSONB,
          geo_bbox        JSONB,
          is_active       BOOLEAN NOT NULL DEFAULT true,
          launch_phase    TEXT DEFAULT 'koramangala-mvp'
        )
        """
    )

    op.execute(
        """
        CREATE TABLE cms_blocks (
          id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          block_key       TEXT NOT NULL,
          locale          TEXT NOT NULL DEFAULT 'en-IN',
          payload         JSONB NOT NULL,
          is_active       BOOLEAN NOT NULL DEFAULT true,
          UNIQUE(block_key, locale)
        )
        """
    )

    op.execute(
        """
        CREATE TABLE feature_settings (
          key             TEXT PRIMARY KEY,
          value           JSONB NOT NULL,
          updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )

    op.execute(
        """
        CREATE TABLE repair_offerings (
          id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          slug                TEXT NOT NULL UNIQUE,
          name                TEXT NOT NULL,
          display_price_minor INT NOT NULL,
          currency            TEXT NOT NULL DEFAULT 'INR',
          is_active           BOOLEAN NOT NULL DEFAULT true,
          sort_order          INT NOT NULL DEFAULT 0,
          created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS repair_offerings")
    op.execute("DROP TABLE IF EXISTS feature_settings")
    op.execute("DROP TABLE IF EXISTS cms_blocks")
    op.execute("DROP TABLE IF EXISTS service_area_rules")
    op.execute("DROP TABLE IF EXISTS included_service_items")
    op.execute("DROP TABLE IF EXISTS service_offerings")
    op.execute("DROP TABLE IF EXISTS pricing_policies")
    op.execute("DROP TABLE IF EXISTS service_categories")
    op.execute("DROP TABLE IF EXISTS profiles")
