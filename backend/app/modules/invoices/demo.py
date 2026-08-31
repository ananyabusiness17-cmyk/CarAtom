"""Phase 08 money fixtures on top of JC-1042 / JC-0991 demo visits."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import NAMESPACE_URL, uuid5

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.modules.bookings.models import Booking
from app.modules.estimates.models import Estimate, EstimateLineItem
from app.modules.field_work.models import JobLabour, JobPart
from app.modules.invoices.service import InvoiceService
from app.modules.job_cards.models import JobCard
from app.modules.notifications.models import Notification
from app.modules.payments.models import Payment
from app.modules.payments.service import PaymentService
from app.modules.visits.demo import seed_phase06
from app.modules.visits.models import Visit

RAJESH_ID = str(uuid5(NAMESPACE_URL, "caratom.customer.rajesh"))

JC_1042_LINES = [
    ("SERVICE", "General servicing + health report", 299900),
    ("PART", "AC gas refill", 180000),
    ("PART", "Brake pads (pair)", 320000),
    ("LABOUR", "Brake fluid flush", 45000),
    ("FEE", "Doorstep service fee", 0),
]


def seed_phase08(db: Session, *, also_today: bool = True) -> None:
    seed_phase06(db, also_today=also_today)
    unpaid = _prepare_job(db, "JC-1042", JC_1042_LINES, fitted_parts=True)
    paid = _prepare_job(
        db,
        "JC-0991",
        [("SERVICE", "Headlight bulb replacement", 149900)],
        fitted_parts=False,
    )
    invoices = InvoiceService(db)
    unpaid_invoice = invoices.issue_for_booking(unpaid.id, force=True)
    paid_invoice = invoices.issue_for_booking(paid.id, force=True)
    if paid_invoice.status != "PAID":
        payment = Payment(
            job_card_id=paid.job_card_id,
            invoice_id=paid_invoice.id,
            purpose="FULL",
            status="PENDING",
            amount_minor=paid_invoice.balance_minor,
            currency="INR",
            razorpay_order_id=f"order_seed_{paid_invoice.id[:8]}",
        )
        db.add(payment)
        db.flush()
        PaymentService(db).apply_capture(
            payment,
            provider_payment_id="pay_seed_0991",
            amount_minor=payment.amount_minor,
        )
    _seed_notifications(db, unpaid, unpaid_invoice, paid)
    db.commit()


def _prepare_job(
    db: Session,
    public_ref: str,
    lines: list[tuple[str, str, int]],
    *,
    fitted_parts: bool,
) -> Booking:
    job = db.scalar(select(JobCard).where(JobCard.public_ref == public_ref))
    if job is None:
        raise RuntimeError(f"Missing demo job {public_ref}")
    booking = db.scalar(select(Booking).where(Booking.job_card_id == job.id))
    if booking is None:
        raise RuntimeError(f"Missing demo booking for {public_ref}")
    visits = list(db.scalars(select(Visit).where(Visit.job_card_id == job.id)).all())
    visit = visits[0] if visits else None
    for row in visits:
        row.status = "COMPLETED"
    job.status = "COMPLETED"
    booking.status = "COMPLETED"

    estimate = db.scalar(select(Estimate).where(Estimate.job_card_id == job.id))
    if estimate is None:
        estimate = Estimate(
            job_card_id=job.id,
            version=1,
            status="ACCEPTED",
            total_minor=sum(amount for _, _, amount in lines),
            currency="INR",
            content_hash=f"phase08-{public_ref}",
            source="system",
        )
        db.add(estimate)
        db.flush()
        for index, (kind, label, amount) in enumerate(lines):
            db.add(
                EstimateLineItem(
                    estimate_id=estimate.id,
                    sort_order=index,
                    label=label,
                    kind=kind,
                    amount_minor=amount,
                    currency="INR",
                    is_included=False,
                )
            )
        if fitted_parts:
            db.add(
                EstimateLineItem(
                    estimate_id=estimate.id,
                    sort_order=len(lines),
                    label="Unused cabin filter",
                    kind="PART",
                    amount_minor=50000,
                    currency="INR",
                    is_included=False,
                )
            )
    job.accepted_estimate_id = estimate.id
    if fitted_parts and visit is not None:
        existing_parts = list(
            db.scalars(select(JobPart).where(JobPart.job_card_id == job.id)).all()
        )
        if not existing_parts:
            for sku, label in (("AC-GAS", "AC gas refill"), ("BP", "Brake pads (pair)")):
                db.add(
                    JobPart(
                        visit_id=visit.id,
                        job_card_id=job.id,
                        sku_code=sku,
                        label=label,
                        quantity=Decimal("1"),
                        readiness_status="FITTED",
                    )
                )
            db.add(
                JobLabour(
                    visit_id=visit.id,
                    job_card_id=job.id,
                    description="Brake fluid flush",
                    minutes=30,
                )
            )
    db.flush()
    return booking


def _seed_notifications(db: Session, unpaid: Booking, unpaid_invoice, paid: Booking) -> None:
    db.execute(delete(Notification).where(Notification.profile_id == RAJESH_ID))
    now = datetime.now(UTC)
    db.add(
        Notification(
            profile_id=RAJESH_ID,
            kind="PAYMENT",
            title="Invoice ready",
            body=f"Your invoice for {unpaid.public_ref} is ready. Balance due: ₹9,970.",
            deep_link=f"caratom://invoice/{unpaid_invoice.id}",
            resource_type="invoice",
            resource_id=unpaid_invoice.id,
        )
    )
    db.add(
        Notification(
            profile_id=RAJESH_ID,
            kind="REVIEW_PROMPT",
            title="Rate your service",
            body=f"Tell us how {paid.public_ref} went.",
            deep_link=f"caratom://review/{paid.id}",
            resource_type="booking",
            resource_id=paid.id,
        )
    )
    db.add(
        Notification(
            profile_id=RAJESH_ID,
            kind="BOOKING",
            title="Booking confirmed",
            body=f"Your visit for {unpaid.public_ref} is scheduled.",
            deep_link=f"caratom://booking/{unpaid.id}",
            resource_type="booking",
            resource_id=unpaid.id,
            read_at=now - timedelta(days=1),
        )
    )
