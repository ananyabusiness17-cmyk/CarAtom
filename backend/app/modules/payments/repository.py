from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.payments.models import Payment, PaymentEvent

OPEN_STATUSES = ("CREATED", "PENDING", "AUTHORIZED")


class PaymentRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, payment_id: str) -> Payment | None:
        return self.db.get(Payment, payment_id)

    def get_by_provider_order_id(self, order_id: str) -> Payment | None:
        return self.db.scalar(select(Payment).where(Payment.razorpay_order_id == order_id))

    def get_open_for_invoice_purpose(self, invoice_id: str, purpose: str) -> Payment | None:
        return self.db.scalar(
            select(Payment).where(
                Payment.invoice_id == invoice_id,
                Payment.purpose == purpose,
                Payment.status.in_(OPEN_STATUSES),
            )
        )

    def get_by_idempotency_key(self, key: str) -> Payment | None:
        return self.db.scalar(select(Payment).where(Payment.idempotency_key == key))

    def list_for_invoice(self, invoice_id: str) -> list[Payment]:
        return list(self.db.scalars(select(Payment).where(Payment.invoice_id == invoice_id)).all())

    def captured_parts_advance_total(self, job_card_id: str) -> int:
        rows = self.db.scalars(
            select(Payment).where(
                Payment.job_card_id == job_card_id,
                Payment.purpose == "PARTS_ADVANCE",
                Payment.status == "CAPTURED",
            )
        ).all()
        return sum(row.amount_minor for row in rows)

    def insert_event(
        self,
        *,
        provider_event_id: str | None,
        event_type: str,
        payload: dict | None,
        signature_valid: bool,
        payment_id: str | None = None,
    ) -> tuple[PaymentEvent, bool]:
        if provider_event_id:
            existing = self.db.scalar(
                select(PaymentEvent).where(PaymentEvent.provider_event_id == provider_event_id)
            )
            if existing is not None:
                return existing, False
        event = PaymentEvent(
            payment_id=payment_id,
            event_type=event_type,
            provider_event_id=provider_event_id,
            payload=payload,
            signature_valid=signature_valid,
            processed_at=datetime.now(UTC),
            processing_result="success",
        )
        self.db.add(event)
        self.db.flush()
        return event, True
