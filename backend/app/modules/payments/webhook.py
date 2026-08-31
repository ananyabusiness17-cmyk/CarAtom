import hashlib
import hmac
import json
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy.orm import Session

from app.common.errors import DomainProblem
from app.config import settings
from app.modules.payments.repository import PaymentRepository
from app.modules.payments.service import SAFE_FAIL, PaymentService


def verify_razorpay_signature(body: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


def process_razorpay_webhook(
    db: Session,
    *,
    body: bytes,
    signature: str | None,
    require_signature: bool = True,
) -> dict:
    if require_signature:
        if settings.env == "production" and not settings.razorpay_webhook_secret:
            raise DomainProblem(500, "INTERNAL", "Webhook is not configured.")
        if not signature or not settings.razorpay_webhook_secret:
            raise DomainProblem(401, "UNAUTHORIZED", "Invalid webhook signature.")
        if not verify_razorpay_signature(body, signature, settings.razorpay_webhook_secret):
            raise DomainProblem(401, "UNAUTHORIZED", "Invalid webhook signature.")

    try:
        payload = json.loads(body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise DomainProblem(400, "INVALID_STATE", "Malformed webhook body.") from exc

    event_type = str(payload.get("event") or "")
    event_id = _event_id(payload)
    repo = PaymentRepository(db)
    event, created = repo.insert_event(
        provider_event_id=event_id,
        event_type=event_type,
        payload=payload,
        signature_valid=True,
    )
    if not created:
        event.processing_result = "duplicate"
        db.flush()
        return {"received": True, "duplicate": True}

    payments = PaymentService(db)
    entity = _payment_entity(payload)
    order_id = entity.get("order_id") if entity else None
    payment = repo.get_by_provider_order_id(str(order_id)) if order_id else None
    if payment is None and entity and entity.get("id"):
        from sqlalchemy import select

        from app.modules.payments.models import Payment

        payment = db.scalar(select(Payment).where(Payment.razorpay_payment_id == str(entity["id"])))
    event.payment_id = payment.id if payment else None

    if event_type in {"payment.captured", "order.paid"}:
        if payment is None:
            event.processing_result = "ignored"
            db.flush()
            return {"received": True, "ignored": True}
        amount = entity.get("amount") if entity else None
        try:
            payments.apply_capture(
                payment,
                provider_payment_id=str(entity.get("id")) if entity else None,
                amount_minor=int(amount) if amount is not None else None,
            )
        except DomainProblem:
            event.processing_result = "exception"
            db.flush()
            return {"received": True, "exception": True}
    elif event_type == "payment.failed":
        if payment is not None:
            payments.apply_failure(payment, reason=SAFE_FAIL)
    else:
        event.processing_result = "ignored"

    event.processed_at = datetime.now(UTC)
    db.flush()
    return {"received": True}


def _event_id(payload: dict) -> str:
    for key in ("id", "event_id"):
        value = payload.get(key)
        if isinstance(value, str) and value:
            return value
    entity = _payment_entity(payload)
    if entity and entity.get("id") and payload.get("event"):
        return f"{payload['event']}:{entity['id']}"
    return f"evt_{uuid4().hex}"


def _payment_entity(payload: dict) -> dict:
    nested = payload.get("payload") or {}
    payment = nested.get("payment") or nested.get("order") or {}
    entity = payment.get("entity") if isinstance(payment, dict) else None
    return entity if isinstance(entity, dict) else {}
