from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, Text, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from app.db.models import Base


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    profile_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("profiles.id"), nullable=False
    )
    kind: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    deep_link: Mapped[str | None] = mapped_column(Text, nullable=True)
    resource_type: Mapped[str | None] = mapped_column(Text, nullable=True)
    resource_id: Mapped[str | None] = mapped_column(Uuid(as_uuid=False), nullable=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    intent: Mapped[str | None] = mapped_column(Text, nullable=True)
    template_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    template_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    channels_attempted: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    entity_type: Mapped[str | None] = mapped_column(Text, nullable=True)
    entity_id: Mapped[str | None] = mapped_column(Uuid(as_uuid=False), nullable=True)
    deep_link_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    delivery_status: Mapped[str] = mapped_column(Text, nullable=False, default="pending")


class OutboxEvent(Base):
    __tablename__ = "outbox_events"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    event_type: Mapped[str] = mapped_column(Text, nullable=False)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notification_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("notifications.id", ondelete="SET NULL"),
        nullable=True,
    )
    channel: Mapped[str] = mapped_column(Text, nullable=False, default="internal")
    idempotency_key: Mapped[str] = mapped_column(
        Text, unique=True, nullable=False, default=lambda: str(uuid4())
    )
    status: Mapped[str] = mapped_column(Text, nullable=False, default="PENDING")
    attempt_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    max_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=8)
    available_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    claimed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    claim_token: Mapped[str | None] = mapped_column(Uuid(as_uuid=False), nullable=True)
    last_error_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    provider_receipt: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class DevicePushToken(Base):
    __tablename__ = "device_push_tokens"
    __table_args__ = (
        UniqueConstraint(
            "profile_id", "app_surface", "expo_push_token", name="uq_device_push_token"
        ),
    )

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    profile_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False
    )
    app_surface: Mapped[str] = mapped_column(Text, nullable=False)
    expo_push_token: Mapped[str] = mapped_column(Text, nullable=False)
    platform: Mapped[str] = mapped_column(Text, nullable=False)
    device_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    profile_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    schema_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    app_surface: Mapped[str | None] = mapped_column(Text, nullable=True)
    session_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    properties: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
