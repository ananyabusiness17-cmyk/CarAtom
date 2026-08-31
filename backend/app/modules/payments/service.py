from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common.errors import DomainProblem
from app.core.deps import CurrentUser
from app.db.models import Profile
from app.modules.bookings.models import Booking
from app.modules.invoices.repository import InvoiceRepository
from app.modules.invoices.service import InvoiceService
from app.modules.job_cards import state_machine
from app.modules.job_cards.models import JobCard
from app.modules.job_cards.repository import JobCardRepository
from app.modules.notifications.models import OutboxEvent
from app.modules.payments.models import PartsAdvanceAllocation, Payment
from app.modules.payments.razorpay_client import get_razorpay_client, public_razorpay_key_id
from app.modules.payments.repository import OPEN_STATUSES, PaymentRepository
from app.modules.payments.schemas import PaymentOrderResponse, PaymentOut, PaymentPrefill

ORDER_TTL = timedelta(minutes=30)
SAFE_FAIL = "Payment could not be completed. Try again."


def dto_status(status: str) -> str:
    if status == "CREATED":
        return "PENDING"
    return status


def verification_status(payment: Payment) -> str:
    if payment.status == "CAPTURED":
        return "VERIFIED"
    if payment.status == "FAILED":
        return "FAILED"
    if payment.status in OPEN_STATUSES:
        return "PENDING" if payment.razorpay_order_id else "NOT_STARTED"
    return "NOT_STARTED"


class PaymentService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = PaymentRepository(db)
        self.invoices = InvoiceRepository(db)

    def create_payment_order(
        self,
        invoice_id: str,
        purpose: str,
        user: CurrentUser,
        idempotency_key: str | None,
    ) -> PaymentOrderResponse:
        purpose = purpose.upper()
        if purpose not in {"FULL", "BALANCE", "PARTS_ADVANCE"}:
            raise DomainProblem(422, "INVALID_PAYMENT_PURPOSE", "Invalid payment purpose.")
        invoice = self.invoices.get(invoice_id)
        if invoice is None:
            raise DomainProblem(404, "NOT_FOUND", "Invoice not found.")
        booking = self.db.get(Booking, invoice.booking_id)
        if booking is None or (booking.profile_id != user.id and user.role != "admin"):
            raise DomainProblem(404, "NOT_FOUND", "Not found.")
        if invoice.status in {"VOID"}:
            raise DomainProblem(409, "INVOICE_NOT_PAYABLE", "Invoice is not ready for payment.")
        if invoice.balance_minor <= 0 or invoice.status == "PAID":
            raise DomainProblem(
                409,
                "PAYMENT_ALREADY_SETTLED",
                "This invoice is already paid.",
            )
        if invoice.status not in {"ISSUED", "PARTIALLY_PAID", "DRAFT"}:
            raise DomainProblem(409, "INVOICE_NOT_PAYABLE", "Invoice is not ready for payment.")

        if idempotency_key:
            prior = self.repo.get_by_idempotency_key(idempotency_key)
            if prior is not None:
                return self._order_response(prior, booking)

        existing = self.repo.get_open_for_invoice_purpose(invoice.id, purpose)
        now = datetime.now(UTC)
        if existing is not None:
            expires = existing.expires_at
            if expires is None:
                return self._order_response(existing, booking)
            aware = expires if expires.tzinfo else expires.replace(tzinfo=UTC)
            if aware > now:
                return self._order_response(existing, booking)

        amount = invoice.balance_minor
        if purpose == "PARTS_ADVANCE":
            amount = min(amount, amount)

        order = get_razorpay_client().create_order(
            amount_minor=amount,
            currency=invoice.currency,
            receipt=invoice.invoice_number,
            notes={"invoice_id": invoice.id, "booking_id": booking.id, "purpose": purpose},
        )
        payment = Payment(
            job_card_id=booking.job_card_id,
            invoice_id=invoice.id,
            purpose=purpose,
            status="PENDING",
            amount_minor=amount,
            currency=invoice.currency,
            razorpay_order_id=order.id,
            idempotency_key=idempotency_key,
            expires_at=now + ORDER_TTL,
            provider="RAZORPAY",
        )
        self.db.add(payment)
        self.db.flush()
        return self._order_response(payment, booking)

    def get_for_user(self, payment_id: str, user: CurrentUser) -> Payment:
        payment = self.repo.get(payment_id)
        if payment is None:
            raise DomainProblem(404, "NOT_FOUND", "Not found.")
        job = self.db.get(JobCard, payment.job_card_id)
        if job is None:
            raise DomainProblem(404, "NOT_FOUND", "Not found.")
        booking = self.db.scalar(select(Booking).where(Booking.job_card_id == job.id).limit(1))
        owner = booking.profile_id if booking else job.profile_id
        if owner != user.id and user.role != "admin":
            raise DomainProblem(404, "NOT_FOUND", "Not found.")
        return payment

    def to_out(self, payment: Payment) -> PaymentOut:
        invoice = self.invoices.get(payment.invoice_id) if payment.invoice_id else None
        status = dto_status(payment.status)
        verify = verification_status(payment)
        message = None
        if verify == "PENDING":
            message = "Confirming your payment. This usually takes a few seconds."
        return PaymentOut(
            id=payment.id,
            payment_id=payment.id,
            invoice_id=payment.invoice_id,
            status=status,
            amount_minor=payment.amount_minor,
            currency=payment.currency,
            purpose=payment.purpose,
            verification_status=verify,
            captured_at=payment.captured_at,
            invoice_status=invoice.status if invoice else None,
            message=message,
            failure_reason=payment.failure_reason,
            amount={"amount_minor": payment.amount_minor, "currency": payment.currency},
        )

    def apply_capture(
        self,
        payment: Payment,
        *,
        provider_payment_id: str | None,
        amount_minor: int | None = None,
    ) -> Payment:
        if payment.status == "CAPTURED":
            return payment
        if amount_minor is not None and amount_minor != payment.amount_minor:
            raise DomainProblem(
                409,
                "INVALID_AMOUNT",
                "Captured amount does not match the payment order.",
            )
        now = datetime.now(UTC)
        payment.status = "CAPTURED"
        payment.razorpay_payment_id = provider_payment_id or payment.razorpay_payment_id
        payment.captured_at = now
        payment.updated_at = now
        if payment.invoice_id:
            invoice = self.invoices.get(payment.invoice_id)
            if invoice is not None:
                InvoiceService(self.db).apply_allocation(invoice, payment.amount_minor)
        if payment.purpose == "PARTS_ADVANCE":
            self._complete_parts_advance(payment)
        self.db.add(
            OutboxEvent(
                event_type="payment.captured",
                payload={"payment_id": payment.id, "invoice_id": payment.invoice_id},
            )
        )
        self.db.flush()
        return payment

    def apply_failure(self, payment: Payment, *, reason: str | None = None) -> Payment:
        if payment.status == "CAPTURED":
            return payment
        payment.status = "FAILED"
        payment.failure_reason = reason or SAFE_FAIL
        payment.updated_at = datetime.now(UTC)
        self.db.flush()
        return payment

    def _complete_parts_advance(self, payment: Payment) -> None:
        from app.modules.inspection_repair.service import InspectionRepairService

        allocation = self.db.scalar(
            select(PartsAdvanceAllocation).where(PartsAdvanceAllocation.payment_id == payment.id)
        )
        if allocation is None:
            allocation = self.db.scalar(
                select(PartsAdvanceAllocation).where(
                    PartsAdvanceAllocation.job_card_id == payment.job_card_id,
                    PartsAdvanceAllocation.estimate_id == payment.estimate_id,
                )
            )
        if allocation is not None:
            allocation.status = "CAPTURED"
            allocation.payment_id = payment.id
            allocation.updated_at = datetime.now(UTC)
        job_card = self.db.get(JobCard, payment.job_card_id)
        if job_card is not None and job_card.status == "PARTS_ADVANCE_DUE":
            target = InspectionRepairService(self.db).transition_on_parts_advance_captured(job_card)
            state_machine.transition(job_card, target)
            job_card.updated_at = datetime.now(UTC)
            JobCardRepository(self.db).add_event(
                job_card.id,
                "PARTS_ADVANCE_CAPTURED",
                actor_profile_id=None,
                request_id=None,
                payload={"payment_id": payment.id},
            )
            self.db.add(
                OutboxEvent(
                    event_type="parts_advance_paid",
                    payload={"job_card_id": job_card.id, "payment_id": payment.id},
                )
            )

    def _order_response(self, payment: Payment, booking: Booking) -> PaymentOrderResponse:
        profile = self.db.get(Profile, booking.profile_id)
        return PaymentOrderResponse(
            payment_id=payment.id,
            razorpay_order_id=payment.razorpay_order_id,
            razorpay_key_id=public_razorpay_key_id(),
            amount_minor=payment.amount_minor,
            currency=payment.currency,
            purpose=payment.purpose,
            status=dto_status(payment.status),
            verification_status=verification_status(payment),
            expires_at=payment.expires_at,
            prefill=PaymentPrefill(
                name=profile.full_name if profile else None,
                contact=profile.phone if profile else None,
            ),
        )
