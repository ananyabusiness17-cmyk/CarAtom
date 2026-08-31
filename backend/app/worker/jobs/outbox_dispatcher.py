from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.integrations.factory import get_messaging_adapter
from app.integrations.ports.messaging import PushMessage, SmsMessage, WhatsAppMessage
from app.modules.notifications.models import DevicePushToken, Notification, OutboxEvent

BACKOFF_SECONDS = (30, 120, 300, 900, 3600, 7200, 14400, 28800)
STALE_CLAIM = timedelta(minutes=5)


def backoff_seconds(attempt: int) -> int:
    if attempt <= 0:
        return BACKOFF_SECONDS[0]
    index = min(attempt - 1, len(BACKOFF_SECONDS) - 1)
    return BACKOFF_SECONDS[index]


def reap_stale_claims(db: Session) -> int:
    cutoff = datetime.now(UTC) - STALE_CLAIM
    rows = list(
        db.scalars(
            select(OutboxEvent).where(
                OutboxEvent.status == "CLAIMED",
                OutboxEvent.claimed_at.is_not(None),
                OutboxEvent.claimed_at < cutoff,
            )
        ).all()
    )
    for row in rows:
        row.status = "PENDING"
        row.claimed_at = None
        row.claim_token = None
        row.updated_at = datetime.now(UTC)
    return len(rows)


def claim_batch(db: Session) -> list[OutboxEvent]:
    now = datetime.now(UTC)
    query = (
        select(OutboxEvent)
        .where(
            OutboxEvent.status.in_(("PENDING", "FAILED")),
            OutboxEvent.available_at <= now,
            OutboxEvent.attempt_count < OutboxEvent.max_attempts,
        )
        .order_by(OutboxEvent.available_at)
        .limit(settings.outbox_batch_size)
    )
    if db.get_bind().dialect.name == "postgresql":
        query = query.with_for_update(skip_locked=True)
    rows = list(db.scalars(query).all())
    token = str(uuid4())
    for row in rows:
        row.status = "CLAIMED"
        row.claimed_at = now
        row.claim_token = token
        row.updated_at = now
    db.flush()
    return rows


async def dispatch_row(db: Session, row: OutboxEvent) -> None:
    adapter = get_messaging_adapter()
    payload = dict(row.payload or {})
    if row.channel == "internal":
        _succeed(row, {"skipped": "internal"})
        return
    result = None
    if row.channel == "push":
        result = await _send_push(db, adapter, row, payload)
    elif row.channel == "sms":
        to_e164 = payload.get("to_e164")
        if not to_e164:
            _dead_letter(row, "NO_PHONE", False)
            return
        result = await adapter.send_sms(
            SmsMessage(to_e164=to_e164, body=str(payload.get("body") or "")[:1600])
        )
    elif row.channel == "whatsapp":
        to_e164 = payload.get("to_e164")
        if not to_e164:
            _dead_letter(row, "NO_PHONE", False)
            return
        params = payload.get("template_params") or {}
        result = await adapter.send_whatsapp(
            WhatsAppMessage(
                to_e164=to_e164,
                template_name=str(payload.get("template_name") or "caratom_generic"),
                template_params={str(k): str(v) for k, v in params.items()},
            )
        )
    else:
        _dead_letter(row, "UNKNOWN_CHANNEL", False)
        return
    assert result is not None
    if result.revoke_token:
        _revoke_token(db, str(payload.get("expo_push_token") or ""))
    if result.success:
        _succeed(row, result.receipt or {"id": result.provider_message_id})
        _mark_notification(db, row.notification_id, "delivered")
        return
    retryable = result.retryable
    row.attempt_count += 1
    row.last_error_code = result.error_code
    row.last_error_message = (result.error_code or "PROVIDER")[:64]
    row.provider_receipt = result.receipt
    row.updated_at = datetime.now(UTC)
    if not retryable or row.attempt_count >= row.max_attempts:
        _dead_letter(row, result.error_code or "MAX_ATTEMPTS", retryable)
        _mark_notification(db, row.notification_id, "failed")
        return
    row.status = "FAILED"
    row.available_at = datetime.now(UTC) + timedelta(seconds=backoff_seconds(row.attempt_count))
    row.claimed_at = None
    row.claim_token = None


async def _send_push(db: Session, adapter, row: OutboxEvent, payload: dict):
    profile_id = payload.get("profile_id")
    surface = payload.get("app_surface") or "customer"
    tokens = list(
        db.scalars(
            select(DevicePushToken).where(
                DevicePushToken.profile_id == profile_id,
                DevicePushToken.app_surface == surface,
                DevicePushToken.revoked_at.is_(None),
            )
        ).all()
    )
    if not tokens:
        from app.integrations.ports.messaging import SendResult

        return SendResult(success=False, error_code="NO_DEVICE_TOKEN", retryable=True)
    last = None
    any_ok = False
    for token in tokens:
        payload["expo_push_token"] = token.expo_push_token
        last = await adapter.send_push(
            PushMessage(
                to_token=token.expo_push_token,
                title=str(payload.get("title") or "CARATOM"),
                body=str(payload.get("body") or ""),
                data={
                    "deep_link_path": str(payload.get("deep_link_path") or ""),
                    "intent": str(payload.get("intent") or ""),
                    "entity_type": str(payload.get("entity_type") or ""),
                    "entity_id": str(payload.get("entity_id") or ""),
                },
            )
        )
        if last.revoke_token:
            token.revoked_at = datetime.now(UTC)
        if last.success:
            any_ok = True
    if any_ok:
        return last if last and last.success else last
    return last


def _succeed(row: OutboxEvent, receipt: dict) -> None:
    now = datetime.now(UTC)
    row.status = "SUCCEEDED"
    row.processed_at = now
    row.provider_receipt = receipt
    row.claimed_at = None
    row.updated_at = now


def _dead_letter(row: OutboxEvent, code: str, retryable: bool) -> None:
    now = datetime.now(UTC)
    row.status = "DEAD_LETTER"
    row.last_error_code = code
    row.claimed_at = None
    row.claim_token = None
    row.updated_at = now
    row.processed_at = now


def _mark_notification(db: Session, notification_id: str | None, status: str) -> None:
    if not notification_id:
        return
    note = db.get(Notification, notification_id)
    if note is None:
        return
    note.delivery_status = status


def _revoke_token(db: Session, token: str) -> None:
    if not token:
        return
    row = db.scalar(select(DevicePushToken).where(DevicePushToken.expo_push_token == token))
    if row is not None:
        row.revoked_at = datetime.now(UTC)


async def run(ctx: dict) -> str:
    from app.db.session import SessionLocal

    db = SessionLocal()
    try:
        reaped = reap_stale_claims(db)
        rows = claim_batch(db)
        db.commit()
        for row in rows:
            fresh = db.get(OutboxEvent, row.id)
            if fresh is None:
                continue
            await dispatch_row(db, fresh)
        db.commit()
        return f"dispatched={len(rows)} reaped={reaped}"
    finally:
        db.close()
