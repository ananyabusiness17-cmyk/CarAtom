from datetime import UTC, datetime
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common.errors import DomainProblem
from app.core.deps import CurrentUser, require_role, require_user
from app.db.models import Profile
from app.db.session import get_db
from app.modules.audit.service import AuditService, require_reason
from app.modules.notifications.models import AnalyticsEvent, DevicePushToken, OutboxEvent
from app.modules.notifications.schemas import (
    AnalyticsBatchIn,
    DevicePushTokenIn,
    DevicePushTokenOut,
    NotificationListResponse,
    NotificationOut,
    OutboxRetryIn,
)
from app.modules.notifications.service import NotificationService, enqueue_intent

router = APIRouter()
admin_router = APIRouter()
analytics_router = APIRouter()

SURFACES = {"customer", "technician", "admin_mobile"}
PLATFORMS = {"ios", "android"}
EXPO_PREFIXES = ("ExponentPushToken[", "ExpoPushToken[")
PII_PROPERTY_KEYS = {
    "phone",
    "address",
    "reg",
    "registration",
    "payment_id",
    "razorpay_payment_id",
    "image",
    "image_url",
    "url",
    "concern",
    "concerns",
    "email",
    "full_name",
    "name",
    "lat",
    "lng",
}


def _validate_token(body: DevicePushTokenIn) -> None:
    if body.app_surface not in SURFACES:
        raise DomainProblem(400, "DEVICE_TOKEN_INVALID", "Unknown app surface.")
    if body.platform not in PLATFORMS:
        raise DomainProblem(400, "DEVICE_TOKEN_INVALID", "Unknown platform.")
    token = body.expo_push_token.strip()
    if not any(token.startswith(prefix) for prefix in EXPO_PREFIXES) or not token.endswith("]"):
        raise DomainProblem(400, "DEVICE_TOKEN_INVALID", "Expo push token is invalid.")


@router.get("/me/notifications", response_model=NotificationListResponse)
def list_notifications(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_user)],
    cursor: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
) -> NotificationListResponse:
    return NotificationService(db).list_mine(user, cursor, limit)


@router.patch("/me/notifications/{notification_id}/read", response_model=NotificationOut)
@router.post("/me/notifications/{notification_id}/read", response_model=NotificationOut)
def mark_notification_read(
    notification_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_user)],
) -> NotificationOut:
    result = NotificationService(db).mark_read(notification_id, user)
    db.commit()
    return result


@router.post("/me/notifications/mark-all-read")
@router.post("/me/notifications/read-all")
def mark_all_notifications_read(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_user)],
) -> dict:
    result = NotificationService(db).mark_all_read(user)
    db.commit()
    return result


@router.put("/me/device-push-token", response_model=DevicePushTokenOut)
def upsert_device_push_token(
    body: DevicePushTokenIn,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_user)],
) -> DevicePushTokenOut:
    _validate_token(body)
    now = datetime.now(UTC)
    existing = db.scalar(
        select(DevicePushToken).where(
            DevicePushToken.profile_id == user.id,
            DevicePushToken.app_surface == body.app_surface,
            DevicePushToken.expo_push_token == body.expo_push_token.strip(),
        )
    )
    if existing is None:
        existing = DevicePushToken(
            profile_id=user.id,
            app_surface=body.app_surface,
            expo_push_token=body.expo_push_token.strip(),
            platform=body.platform,
            device_id=body.device_id,
            last_seen_at=now,
        )
        db.add(existing)
    else:
        existing.platform = body.platform
        existing.device_id = body.device_id or existing.device_id
        existing.last_seen_at = now
        existing.revoked_at = None
    db.commit()
    db.refresh(existing)
    return DevicePushTokenOut(
        id=existing.id, revoked_at=existing.revoked_at, last_seen_at=existing.last_seen_at
    )


@router.delete("/me/device-push-token/{token_id}")
def delete_device_push_token(
    token_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_user)],
) -> dict:
    row = db.get(DevicePushToken, token_id)
    if row is None or row.profile_id != user.id:
        raise DomainProblem(404, "NOT_FOUND", "Not found.")
    row.revoked_at = datetime.now(UTC)
    db.commit()
    return {"revoked": True}


def _redact_payload(payload: dict) -> dict:
    redacted = dict(payload)
    phone = redacted.get("to_e164")
    if isinstance(phone, str) and len(phone) >= 4:
        redacted["to_e164"] = f"***{phone[-4:]}"
    redacted.pop("expo_push_token", None)
    return redacted


class OutboxRowOut(BaseModel):
    id: str
    channel: str
    event_type: str
    status: str
    attempt_count: int
    last_error_code: str | None
    last_error_message: str | None
    created_at: datetime
    available_at: datetime
    payload: dict
    notification_id: str | None


class OutboxListOut(BaseModel):
    items: list[OutboxRowOut]
    next_cursor: str | None = None


@admin_router.get("/notifications/outbox", response_model=OutboxListOut)
def list_outbox(
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[CurrentUser, Depends(require_role("admin"))],
    status: Annotated[str | None, Query()] = "DEAD_LETTER",
    cursor: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
) -> OutboxListOut:
    query = select(OutboxEvent).order_by(OutboxEvent.created_at.desc(), OutboxEvent.id.desc())
    if status:
        query = query.where(OutboxEvent.status == status)
    if cursor:
        created, row_id = cursor.split("|", 1)
        created_dt = datetime.fromisoformat(created)
        query = query.where(
            (OutboxEvent.created_at < created_dt)
            | ((OutboxEvent.created_at == created_dt) & (OutboxEvent.id < row_id))
        )
    rows = list(db.scalars(query.limit(limit + 1)).all())
    next_cursor = None
    if len(rows) > limit:
        last = rows[limit - 1]
        next_cursor = f"{last.created_at.isoformat()}|{last.id}"
        rows = rows[:limit]
    return OutboxListOut(
        items=[
            OutboxRowOut(
                id=row.id,
                channel=row.channel,
                event_type=row.event_type,
                status=row.status,
                attempt_count=row.attempt_count,
                last_error_code=row.last_error_code,
                last_error_message=row.last_error_message,
                created_at=row.created_at,
                available_at=row.available_at,
                payload=_redact_payload(dict(row.payload or {})),
                notification_id=row.notification_id,
            )
            for row in rows
        ],
        next_cursor=next_cursor,
    )


@admin_router.post("/notifications/outbox/{outbox_id}/retry")
def retry_outbox(
    outbox_id: str,
    body: OutboxRetryIn,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[CurrentUser, Depends(require_role("admin"))],
) -> dict:
    reason = require_reason(body.reason, command="notifications.outbox.retry")
    row = db.get(OutboxEvent, outbox_id)
    if row is None:
        raise DomainProblem(404, "NOT_FOUND", "Not found.")
    if row.status not in {"DEAD_LETTER", "FAILED"}:
        raise DomainProblem(409, "OUTBOX_NOT_RETRYABLE", "This outbox row cannot be retried.")
    before = {"status": row.status, "attempt_count": row.attempt_count}
    row.status = "PENDING"
    row.attempt_count = max(0, row.attempt_count - 2)
    row.available_at = datetime.now(UTC)
    row.claimed_at = None
    row.claim_token = None
    row.updated_at = datetime.now(UTC)
    AuditService(db).record(
        admin,
        "notifications.outbox.retry",
        "outbox_event",
        row.id,
        reason=reason,
        before=before,
        after={"status": "PENDING"},
        request_id=getattr(request.state, "request_id", None),
    )
    db.commit()
    return {"id": row.id, "status": row.status}


class SimulateNotificationIn(BaseModel):
    profile_id: str
    intent: str = "slot_confirmed"
    entity_type: str = "booking"
    entity_id: str | None = None


@admin_router.post("/dev/simulate-notification")
def simulate_notification(
    body: SimulateNotificationIn,
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[CurrentUser, Depends(require_role("admin"))],
) -> dict:
    from app.config import settings

    if settings.env == "production":
        raise DomainProblem(404, "NOT_FOUND", "Not found.")
    profile = db.get(Profile, body.profile_id)
    if profile is None:
        raise DomainProblem(404, "NOT_FOUND", "Profile not found.")
    entity_id = body.entity_id or str(uuid4())
    row = enqueue_intent(
        db,
        profile_id=body.profile_id,
        intent=body.intent,
        entity_type=body.entity_type,
        entity_id=entity_id,
        context={"service_name": "test"},
        request_id=None,
        role="customer" if profile.role == "customer" else profile.role,
    )
    db.commit()
    return {"notification_id": row.id, "intent": body.intent}


def _strip_pii(properties: dict) -> dict:
    clean = {}
    for key, value in properties.items():
        if key.lower() in PII_PROPERTY_KEYS:
            continue
        if isinstance(value, str) and (
            value.startswith("+91") or "http://" in value or "https://" in value
        ):
            continue
        clean[key] = value
    return clean


@analytics_router.post("/analytics/events")
def ingest_analytics(
    body: AnalyticsBatchIn,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_user)],
) -> dict:
    accepted = 0
    for event in body.events[:50]:
        try:
            row = AnalyticsEvent(
                profile_id=user.id,
                name=event.name[:128],
                schema_version=event.schema_version,
                app_surface=event.app_surface,
                session_id=event.session_id,
                properties=_strip_pii(event.properties),
                occurred_at=event.occurred_at,
            )
            db.add(row)
            accepted += 1
        except Exception:
            continue
    try:
        db.commit()
    except Exception:
        db.rollback()
        return {"accepted": 0}
    return {"accepted": accepted}
