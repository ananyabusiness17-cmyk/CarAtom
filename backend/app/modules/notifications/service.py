from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.common.errors import DomainProblem
from app.config import settings
from app.core.deps import CurrentUser
from app.db.models import Profile
from app.modules.notifications.channel_policy import (
    app_surface_for,
    channels_for,
    kind_for,
)
from app.modules.notifications.models import Notification, OutboxEvent
from app.modules.notifications.repository import NotificationRepository
from app.modules.notifications.schemas import (
    NotificationListMeta,
    NotificationListResponse,
    NotificationOut,
)
from app.modules.notifications.templates_render import render_template


def short_link(entity_type: str, entity_id: str) -> str:
    prefix = {
        "booking": "b",
        "estimate": "e",
        "invoice": "p",
        "payment": "p",
        "advisor": "a",
        "visit": "v",
    }.get(entity_type, "n")
    return f"{settings.staging_link_base}/{prefix}/{entity_id}"


class NotificationService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = NotificationRepository(db)

    def list_mine(
        self, user: CurrentUser, cursor: str | None, limit: int
    ) -> NotificationListResponse:
        rows, next_cursor = self.repo.list_for_profile(user.id, cursor=cursor, limit=limit)
        return NotificationListResponse(
            data=[self.to_out(row) for row in rows],
            meta=NotificationListMeta(
                next_cursor=next_cursor,
                unread_count=self.repo.unread_count(user.id),
                has_more=next_cursor is not None,
            ),
        )

    def mark_read(self, notification_id: str, user: CurrentUser) -> NotificationOut:
        row = self.repo.get(notification_id)
        if row is None or row.profile_id != user.id:
            raise DomainProblem(404, "NOTIFICATION_NOT_FOUND", "Notification not found.")
        self.repo.mark_read(row)
        return self.to_out(row)

    def mark_all_read(self, user: CurrentUser) -> dict:
        count = self.repo.mark_all_read(user.id)
        return {"updated": count}

    def enqueue_intent(
        self,
        *,
        profile_id: str,
        intent: str,
        entity_type: str,
        entity_id: str | UUID,
        context: dict | None = None,
        request_id: str | None = None,
        role: str = "customer",
    ) -> Notification:
        entity_id_str = str(entity_id)
        ctx = dict(context or {})
        ctx.setdefault("service_name", "your vehicle")
        ctx.setdefault(f"{entity_type}_id", entity_id_str)
        ctx.setdefault("deep_link_short", short_link(entity_type, entity_id_str))
        rendered = render_template(intent, ctx)
        version = int(rendered["version"])
        channels = channels_for(intent, role)
        existing = self.db.scalar(
            select(Notification).where(
                Notification.profile_id == profile_id,
                Notification.intent == intent,
                Notification.entity_id == entity_id_str,
            )
        )
        if existing is not None:
            return existing

        profile = self.db.get(Profile, profile_id)
        phone = profile.phone if profile is not None else None
        deep_link = rendered["deep_link_path"]
        row = Notification(
            profile_id=profile_id,
            kind=kind_for(intent),
            title=rendered["title"],
            body=rendered["body"],
            deep_link=deep_link,
            resource_type=entity_type,
            resource_id=entity_id_str,
            intent=intent,
            template_key=intent,
            template_version=version,
            channels_attempted=channels,
            entity_type=entity_type,
            entity_id=entity_id_str,
            deep_link_path=deep_link,
            delivery_status="pending",
        )
        self.repo.add(row)
        self.db.flush()
        surface = app_surface_for(role)
        channel_specs = rendered.get("channels") or {}
        for channel in channels:
            if channel in {"sms", "whatsapp"} and not phone:
                continue
            spec = channel_specs.get(channel) or {}
            key = f"{intent}:{entity_id_str}:{channel}:{version}"
            payload = {
                "title": spec.get("title") or rendered["title"],
                "body": spec.get("body") or rendered["body"],
                "deep_link_path": deep_link,
                "intent": intent,
                "profile_id": profile_id,
                "app_surface": surface,
                "request_id": request_id,
                "entity_type": entity_type,
                "entity_id": entity_id_str,
            }
            if channel in {"sms", "whatsapp"} and phone:
                payload["to_e164"] = phone
            if channel == "whatsapp":
                payload["template_name"] = spec.get("template_name") or f"caratom_{intent}"
                payload["template_params"] = spec.get("params") or {}
            self._insert_outbox(
                notification_id=row.id,
                channel=channel,
                event_type=intent,
                payload=payload,
                idempotency_key=key,
            )
        return row

    def _insert_outbox(
        self,
        *,
        notification_id: str,
        channel: str,
        event_type: str,
        payload: dict,
        idempotency_key: str,
    ) -> OutboxEvent:
        existing = self.db.scalar(
            select(OutboxEvent).where(OutboxEvent.idempotency_key == idempotency_key)
        )
        if existing is not None:
            return existing
        row = OutboxEvent(
            notification_id=notification_id,
            channel=channel,
            event_type=event_type,
            payload=payload,
            idempotency_key=idempotency_key,
            status="PENDING",
            attempt_count=0,
            max_attempts=settings.notification_max_attempts,
            available_at=datetime.now(UTC),
        )
        try:
            with self.db.begin_nested():
                self.db.add(row)
                self.db.flush()
        except IntegrityError:
            found = self.db.scalar(
                select(OutboxEvent).where(OutboxEvent.idempotency_key == idempotency_key)
            )
            if found is None:
                raise
            return found
        return row

    def to_out(self, row: Notification) -> NotificationOut:
        return NotificationOut(
            id=row.id,
            kind=row.kind,
            intent=row.intent or row.kind.lower(),
            title=row.title,
            body=row.body,
            deep_link=row.deep_link_path or row.deep_link,
            deep_link_path=row.deep_link_path or row.deep_link or "caratom://notifications",
            resource_type=row.resource_type,
            resource_id=row.resource_id,
            entity_type=row.entity_type or row.resource_type or "unknown",
            entity_id=row.entity_id or row.resource_id or row.id,
            read_at=row.read_at,
            created_at=row.created_at,
            delivery_status=row.delivery_status or "pending",
        )


def enqueue_intent(
    db: Session,
    *,
    profile_id: str,
    intent: str,
    entity_type: str,
    entity_id: str | UUID,
    context: dict | None = None,
    request_id: str | None = None,
    role: str = "customer",
) -> Notification:
    return NotificationService(db).enqueue_intent(
        profile_id=profile_id,
        intent=intent,
        entity_type=entity_type,
        entity_id=entity_id,
        context=context,
        request_id=request_id,
        role=role,
    )


def enqueue_admins(
    db: Session,
    *,
    intent: str,
    entity_type: str,
    entity_id: str,
    context: dict | None = None,
    request_id: str | None = None,
) -> None:
    admins = list(
        db.scalars(
            select(Profile).where(Profile.role == "admin", Profile.is_active.is_(True))
        ).all()
    )
    for admin in admins:
        enqueue_intent(
            db,
            profile_id=admin.id,
            intent=intent,
            entity_type=entity_type,
            entity_id=entity_id,
            context=context,
            request_id=request_id,
            role="admin",
        )
