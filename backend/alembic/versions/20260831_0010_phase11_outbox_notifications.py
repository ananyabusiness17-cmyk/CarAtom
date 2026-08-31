"""Phase 11 outbox claim/retry, device tokens, analytics, notification columns.

Revision ID: 0010_phase11_outbox
Revises: 0009_phase09_inventory_audit
Create Date: 2026-08-31

Note: revision id must be ≤32 chars (alembic_version.version_num).
"""

from typing import Sequence, Union

from alembic import op

revision: str = "0010_phase11_outbox"
down_revision: Union[str, None] = "0009_phase09_inventory_audit"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        DO $$ BEGIN
          CREATE TYPE outbox_status AS ENUM (
            'PENDING', 'CLAIMED', 'SUCCEEDED', 'FAILED', 'DEAD_LETTER'
          );
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
        """
    )
    op.execute(
        """
        ALTER TABLE outbox_events
          ADD COLUMN IF NOT EXISTS notification_id UUID REFERENCES notifications(id) ON DELETE SET NULL,
          ADD COLUMN IF NOT EXISTS channel VARCHAR(32) NOT NULL DEFAULT 'internal',
          ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128),
          ADD COLUMN IF NOT EXISTS status outbox_status NOT NULL DEFAULT 'PENDING',
          ADD COLUMN IF NOT EXISTS attempt_count INT NOT NULL DEFAULT 0,
          ADD COLUMN IF NOT EXISTS max_attempts INT NOT NULL DEFAULT 8,
          ADD COLUMN IF NOT EXISTS available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS claim_token UUID,
          ADD COLUMN IF NOT EXISTS last_error_code VARCHAR(64),
          ADD COLUMN IF NOT EXISTS last_error_message TEXT,
          ADD COLUMN IF NOT EXISTS provider_receipt JSONB,
          ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
        """
    )
    op.execute(
        """
        UPDATE outbox_events
        SET idempotency_key = id::text,
            status = 'SUCCEEDED',
            channel = COALESCE(NULLIF(channel, ''), 'internal'),
            available_at = COALESCE(available_at, created_at),
            processed_at = COALESCE(processed_at, created_at)
        WHERE idempotency_key IS NULL;
        """
    )
    op.execute(
        """
        ALTER TABLE outbox_events
          ALTER COLUMN idempotency_key SET NOT NULL;
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_outbox_idempotency_key
          ON outbox_events (idempotency_key);
        CREATE INDEX IF NOT EXISTS idx_outbox_pending
          ON outbox_events (status, available_at)
          WHERE status IN ('PENDING', 'FAILED');
        CREATE INDEX IF NOT EXISTS idx_outbox_notification_id
          ON outbox_events (notification_id);
        """
    )
    op.execute(
        """
        ALTER TABLE notifications
          ADD COLUMN IF NOT EXISTS intent VARCHAR(64),
          ADD COLUMN IF NOT EXISTS template_key VARCHAR(64),
          ADD COLUMN IF NOT EXISTS template_version INT NOT NULL DEFAULT 1,
          ADD COLUMN IF NOT EXISTS channels_attempted JSONB NOT NULL DEFAULT '[]'::jsonb,
          ADD COLUMN IF NOT EXISTS entity_type VARCHAR(64),
          ADD COLUMN IF NOT EXISTS entity_id UUID,
          ADD COLUMN IF NOT EXISTS deep_link_path TEXT,
          ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(32) NOT NULL DEFAULT 'pending';
        """
    )
    op.execute(
        """
        UPDATE notifications
        SET intent = COALESCE(intent, lower(kind)),
            entity_type = COALESCE(entity_type, resource_type),
            entity_id = COALESCE(entity_id, resource_id),
            deep_link_path = COALESCE(deep_link_path, deep_link)
        WHERE intent IS NULL OR entity_type IS NULL OR deep_link_path IS NULL;
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS device_push_tokens (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
          app_surface VARCHAR(32) NOT NULL,
          expo_push_token TEXT NOT NULL,
          platform VARCHAR(16) NOT NULL,
          device_id VARCHAR(128),
          last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          revoked_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (profile_id, app_surface, expo_push_token)
        );
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS analytics_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
          name VARCHAR(128) NOT NULL,
          schema_version INT NOT NULL DEFAULT 1,
          app_surface VARCHAR(32),
          session_id VARCHAR(128),
          properties JSONB NOT NULL DEFAULT '{}'::jsonb,
          occurred_at TIMESTAMPTZ NOT NULL,
          received_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_analytics_events_occurred
          ON analytics_events (occurred_at DESC);
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS analytics_events;")
    op.execute("DROP TABLE IF EXISTS device_push_tokens;")
    op.execute(
        """
        ALTER TABLE notifications
          DROP COLUMN IF EXISTS intent,
          DROP COLUMN IF EXISTS template_key,
          DROP COLUMN IF EXISTS template_version,
          DROP COLUMN IF EXISTS channels_attempted,
          DROP COLUMN IF EXISTS entity_type,
          DROP COLUMN IF EXISTS entity_id,
          DROP COLUMN IF EXISTS deep_link_path,
          DROP COLUMN IF EXISTS delivery_status;
        """
    )
    op.execute("DROP INDEX IF EXISTS idx_outbox_notification_id;")
    op.execute("DROP INDEX IF EXISTS idx_outbox_pending;")
    op.execute("DROP INDEX IF EXISTS uq_outbox_idempotency_key;")
    op.execute(
        """
        ALTER TABLE outbox_events
          DROP COLUMN IF EXISTS notification_id,
          DROP COLUMN IF EXISTS channel,
          DROP COLUMN IF EXISTS idempotency_key,
          DROP COLUMN IF EXISTS status,
          DROP COLUMN IF EXISTS attempt_count,
          DROP COLUMN IF EXISTS max_attempts,
          DROP COLUMN IF EXISTS available_at,
          DROP COLUMN IF EXISTS claimed_at,
          DROP COLUMN IF EXISTS claim_token,
          DROP COLUMN IF EXISTS last_error_code,
          DROP COLUMN IF EXISTS last_error_message,
          DROP COLUMN IF EXISTS provider_receipt,
          DROP COLUMN IF EXISTS updated_at;
        """
    )
    op.execute("DROP TYPE IF EXISTS outbox_status;")
