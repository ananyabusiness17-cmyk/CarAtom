from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common.errors import DomainProblem
from app.core.deps import CurrentUser
from app.core.time import IST
from app.modules.admin.schemas import (
    LedgerResponse,
    LedgerRowOut,
    OfflinePaymentRequest,
    RefundRequest,
)
from app.modules.audit.service import AuditService, require_reason
from app.modules.bookings.models import Booking
from app.modules.invoices.models import Invoice
from app.modules.invoices.service import InvoiceService
from app.modules.job_cards.models import JobCard
from app.modules.payments.models import Payment, PaymentEvent, Refund


def _aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


class PaymentsAdminService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.audit = AuditService(db)

    def _job_ref(self, job_card_id: str) -> str:
        job = self.db.get(JobCard, job_card_id)
        return job.public_ref if job else job_card_id

    def ledger(
        self,
        *,
        from_dt: datetime | None = None,
        to_dt: datetime | None = None,
        method: str | None = None,
        status: str | None = None,
        cursor: str | None = None,
        limit: int = 50,
    ) -> LedgerResponse:
        now = datetime.now(UTC)
        if from_dt is None:
            start_ist = now.astimezone(IST).replace(hour=0, minute=0, second=0, microsecond=0)
            from_dt = start_ist.astimezone(UTC)
        if to_dt is None:
            to_dt = from_dt + timedelta(days=1)
        query = (
            select(Payment)
            .where(Payment.created_at >= from_dt, Payment.created_at < to_dt)
            .order_by(Payment.created_at.desc())
        )
        if status:
            query = query.where(Payment.status == status)
        payments = list(self.db.scalars(query.limit(200)).all())
        items: list[LedgerRowOut] = []
        for pay in payments:
            method_label = "RAZORPAY_UPI" if pay.provider == "RAZORPAY" else pay.provider
            if method and method not in {method_label, pay.provider}:
                continue
            items.append(
                LedgerRowOut(
                    id=pay.id,
                    job_card_ref=self._job_ref(pay.job_card_id),
                    label=f"{method_label.replace('_', ' ').title()} {pay.purpose.lower()}",
                    amount_minor=pay.amount_minor,
                    method=method_label,
                    status=pay.status,
                    created_at=pay.created_at,
                    payment_id=pay.id,
                )
            )
            refunds = list(self.db.scalars(select(Refund).where(Refund.payment_id == pay.id)).all())
            for refund in refunds:
                items.append(
                    LedgerRowOut(
                        id=refund.id,
                        job_card_ref=self._job_ref(pay.job_card_id),
                        label=f"Refund {self._job_ref(pay.job_card_id)}",
                        amount_minor=-refund.amount_minor,
                        method=method_label,
                        status=refund.status,
                        created_at=refund.created_at,
                        payment_id=pay.id,
                    )
                )
        items.sort(key=lambda row: row.created_at, reverse=True)
        captured = [p.amount_minor for p in payments if p.status in {"CAPTURED", "REFUNDED"}]
        refund_total = 0
        for pay in payments:
            for refund in self.db.scalars(select(Refund).where(Refund.payment_id == pay.id)):
                if refund.status in {"REQUESTED", "COMPLETED"}:
                    refund_total += refund.amount_minor
        total = sum(captured) - refund_total
        return LedgerResponse(
            items=items[:limit],
            next_cursor=None,
            daily_total={"total_minor": total, "currency": "INR"},
        )

    def record_offline(
        self, body: OfflinePaymentRequest, actor: CurrentUser, request_id: str | None
    ) -> dict:
        reason = require_reason(body.reason)
        job = None
        if body.job_card_id:
            job = self.db.get(JobCard, body.job_card_id)
        elif body.job_card_ref:
            job = self.db.scalar(select(JobCard).where(JobCard.public_ref == body.job_card_ref))
        if job is None:
            raise DomainProblem(404, "NOT_FOUND", "Job card not found.")
        booking = self.db.scalar(select(Booking).where(Booking.job_card_id == job.id))
        invoice = None
        if body.invoice_id:
            invoice = self.db.get(Invoice, body.invoice_id)
        elif booking is not None:
            invoice = self.db.scalar(
                select(Invoice).where(Invoice.booking_id == booking.id, Invoice.status != "VOID")
            )
            if invoice is None:
                invoice = InvoiceService(self.db).issue_for_booking(booking.id, force=True)
        payment = Payment(
            job_card_id=job.id,
            invoice_id=invoice.id if invoice else None,
            purpose="BALANCE",
            status="CAPTURED",
            amount_minor=body.amount_minor,
            currency="INR",
            provider=body.method.upper() if body.method else "CASH",
            captured_at=datetime.now(UTC),
        )
        self.db.add(payment)
        self.db.flush()
        self.db.add(
            PaymentEvent(
                payment_id=payment.id,
                event_type="OFFLINE_RECORDED",
                payload={"reason": reason, "reference": body.reference, "actor_id": actor.id},
            )
        )
        if invoice is not None:
            invoice.paid_minor += body.amount_minor
            invoice.balance_minor = max(invoice.total_minor - invoice.paid_minor, 0)
            if invoice.balance_minor == 0:
                invoice.status = "PAID"
            elif invoice.paid_minor > 0:
                invoice.status = "PARTIALLY_PAID"
        audit_id = self.audit.record(
            actor,
            "payments.offline",
            "payment",
            payment.id,
            reason=reason,
            after={"amount_minor": body.amount_minor, "job_card": job.public_ref},
            request_id=request_id,
        )
        return {"payment_id": payment.id, "audit_id": audit_id, "job_card_ref": job.public_ref}

    def refund(
        self, payment_id: str, body: RefundRequest, actor: CurrentUser, request_id: str | None
    ) -> dict:
        reason = require_reason(body.reason)
        payment = self.db.get(Payment, payment_id)
        if payment is None:
            raise DomainProblem(404, "NOT_FOUND", "Payment not found.")
        amount = body.amount_minor or payment.amount_minor
        if amount > payment.amount_minor:
            raise DomainProblem(422, "INVALID_REFUND", "Refund exceeds captured amount.")
        refund = Refund(
            payment_id=payment.id,
            amount_minor=amount,
            status="COMPLETED",
            reason=reason,
        )
        self.db.add(refund)
        self.db.flush()
        self.db.add(
            PaymentEvent(
                payment_id=payment.id,
                event_type="REFUND_RECORDED",
                payload={"refund_id": refund.id, "reason": reason, "amount_minor": amount},
            )
        )
        if amount >= payment.amount_minor:
            payment.status = "REFUNDED"
        if payment.invoice_id:
            invoice = self.db.get(Invoice, payment.invoice_id)
            if invoice is not None:
                invoice.paid_minor = max(invoice.paid_minor - amount, 0)
                invoice.balance_minor = invoice.total_minor - invoice.paid_minor
                if invoice.paid_minor == 0:
                    invoice.status = "ISSUED"
                elif invoice.balance_minor > 0:
                    invoice.status = "PARTIALLY_PAID"
        audit_id = self.audit.record(
            actor,
            "payments.refund",
            "payment",
            payment.id,
            reason=reason,
            after={"refund_id": refund.id, "amount_minor": amount},
            request_id=request_id,
        )
        return {
            "refund_id": refund.id,
            "audit_id": audit_id,
            "amount_minor": amount,
            "job_card_ref": self._job_ref(payment.job_card_id),
        }
