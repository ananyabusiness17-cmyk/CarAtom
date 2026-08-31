from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.modules.bookings.models import Booking, BookingSnapshot
from app.modules.bookings.schemas import BookingListResponse, BookingSummaryOut
from app.modules.bookings.service import format_slot_display


def _aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


def progress_label(status: str) -> str:
    if status == "COMPLETED":
        return "Completed"
    if status in {"CONFIRMED", "HOLDING"}:
        return "Scheduled"
    if status == "IN_PROGRESS":
        return "In progress"
    if status == "CANCELLED":
        return "Cancelled"
    return status.title()


def format_summary(snapshot: BookingSnapshot | None, booking: Booking) -> str:
    policy = snapshot.flow_policy if snapshot else None
    offering = snapshot.offering_snapshot if snapshot and snapshot.offering_snapshot else {}
    name = offering.get("name") or "Visit"
    slot = format_slot_display(booking.slot_starts_at, booking.slot_ends_at)
    if policy == "ONE_MAN":
        short = name.split("/")[0].strip() if name else "lighting"
        return f"One-man · {short.lower()}"
    if policy == "GENERAL_SERVICE":
        estimate = snapshot.estimate_snapshot if snapshot else {}
        lines = estimate.get("line_items") if isinstance(estimate, dict) else None
        has_repairs = any(
            isinstance(line, dict) and line.get("kind") == "REPAIR" for line in (lines or [])
        )
        prefix = "General + repairs" if has_repairs else "General service"
        slot_parts = slot.split(" · ")
        start = slot_parts[1].split(" – ")[0] if len(slot_parts) > 1 else ""
        weekday_time = f"{slot_parts[0]} · {start}".strip(" ·")
        return f"{prefix} · {weekday_time}".strip(" ·")
    return f"{name} · {slot}"


class BookingListService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_for(self, profile_id: str, cursor: str | None, limit: int) -> BookingListResponse:
        query = (
            select(Booking)
            .where(Booking.profile_id == profile_id)
            .options(selectinload(Booking.snapshot))
            .order_by(Booking.created_at.desc())
            .limit(limit + 1)
        )
        if cursor:
            query = query.where(Booking.created_at < datetime.fromisoformat(cursor))
        rows = list(self.db.scalars(query).all())
        next_cursor = None
        if len(rows) > limit:
            next_cursor = rows[limit - 1].created_at.isoformat()
            rows = rows[:limit]
        items = []
        booking_ids = [row.id for row in rows]
        job_ids = [row.job_card_id for row in rows]
        invoices = {}
        if booking_ids:
            from app.modules.invoices.models import Invoice

            for invoice in self.db.scalars(
                select(Invoice).where(Invoice.booking_id.in_(booking_ids), Invoice.status != "VOID")
            ).all():
                invoices[invoice.booking_id] = invoice
        jobs = {}
        if job_ids:
            from app.modules.job_cards.models import JobCard

            for job in self.db.scalars(select(JobCard).where(JobCard.id.in_(job_ids))).all():
                jobs[job.id] = job
        for row in rows:
            invoice = invoices.get(row.id)
            job = jobs.get(row.job_card_id)
            summary = format_summary(row.snapshot, row)
            chip = progress_label(row.status)
            tone = (
                "ok"
                if row.status == "COMPLETED"
                else ("err" if row.status == "CANCELLED" else "warn")
            )
            progress_key = "BOOKING_CONFIRMED"
            hint = "View details"
            if (
                invoice is not None
                and invoice.status in {"ISSUED", "PARTIALLY_PAID"}
                and invoice.balance_minor > 0
            ):
                progress_key = "PAYMENT_DUE"
                chip = "Payment due"
                tone = "warn"
                hint = "Pay invoice"
            elif invoice is not None and invoice.status == "PAID":
                progress_key = "COMPLETED"
                chip = "Completed"
                tone = "ok"
                hint = "View details"
            elif job is not None:
                from app.modules.inspection_repair.progress import customer_progress

                progress_key = customer_progress(job)
                if progress_key == "PARTS_PAYMENT_REQUIRED":
                    chip = "Payment due"
                    hint = "Pay parts advance"
            offering = (row.snapshot.offering_snapshot if row.snapshot else {}) or {}
            vehicle = (row.snapshot.vehicle_snapshot if row.snapshot else {}) or {}
            vehicle_summary = " ".join(
                str(part)
                for part in (vehicle.get("make"), vehicle.get("model"), vehicle.get("year"))
                if part
            )
            items.append(
                BookingSummaryOut(
                    id=row.id,
                    public_ref=row.public_ref,
                    status=row.status,
                    progress_label=chip,
                    service_summary=summary,
                    flow_policy=row.snapshot.flow_policy if row.snapshot else "GENERAL_SERVICE",
                    visit_starts_at=_aware(row.slot_starts_at),
                    created_at=_aware(row.created_at),
                    title=str(offering.get("name") or summary),
                    status_chip=chip,
                    status_tone=tone,
                    subtitle=summary,
                    vehicle_summary=vehicle_summary or None,
                    customer_progress=progress_key,
                    next_action_hint=hint,
                )
            )
        return BookingListResponse(
            items=items, next_cursor=next_cursor, has_more=next_cursor is not None
        )
