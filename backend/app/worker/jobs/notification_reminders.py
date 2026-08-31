from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.modules.bookings.models import Booking
from app.modules.invoices.models import Invoice
from app.modules.notifications.models import Notification
from app.modules.notifications.service import enqueue_intent


def _already_sent(db, intent: str, entity_id: str, window: str) -> bool:
    key = f"{intent}:{window}"
    found = db.scalar(
        select(Notification.id).where(
            Notification.intent == intent,
            Notification.entity_id == entity_id,
            Notification.template_key == key,
        )
    )
    return found is not None


async def run(ctx: dict) -> str:
    from app.db.session import SessionLocal

    db = SessionLocal()
    created = 0
    try:
        now = datetime.now(UTC)
        bookings = list(
            db.scalars(
                select(Booking).where(Booking.status.in_(("CONFIRMED", "BOOKED", "SCHEDULED")))
            ).all()
        )
        for booking in bookings:
            start = booking.slot_starts_at
            if start is None:
                continue
            delta = start - now
            window = None
            if timedelta(hours=23) <= delta <= timedelta(hours=25):
                window = "t24h"
            elif timedelta(minutes=100) <= delta <= timedelta(minutes=140):
                window = "t2h"
            if window is None:
                continue
            intent = "slot_confirmed"
            if _already_sent(db, intent, booking.id, window):
                continue
            row = enqueue_intent(
                db,
                profile_id=booking.profile_id,
                intent=intent,
                entity_type="booking",
                entity_id=booking.id,
                context={"service_name": "your visit", "booking_id": booking.id},
            )
            row.template_key = f"{intent}:{window}"
            created += 1
        due = list(
            db.scalars(
                select(Invoice).where(
                    Invoice.status.in_(("ISSUED", "PARTIALLY_PAID")),
                    Invoice.balance_minor > 0,
                    Invoice.created_at <= now - timedelta(hours=24),
                )
            ).all()
        )
        for invoice in due:
            if _already_sent(db, "payment_due", invoice.id, "t24h"):
                continue
            booking = db.get(Booking, invoice.booking_id)
            if booking is None:
                continue
            row = enqueue_intent(
                db,
                profile_id=booking.profile_id,
                intent="payment_due",
                entity_type="invoice",
                entity_id=invoice.id,
                context={"service_name": "your visit", "invoice_id": invoice.id},
            )
            row.template_key = "payment_due:t24h"
            created += 1
        db.commit()
        return f"reminders={created}"
    finally:
        db.close()
