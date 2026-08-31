from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.bookings.models import Booking
from app.modules.estimates.models import Estimate
from app.modules.field_work.models import JobPart, QcCheck
from app.modules.invoices.models import Invoice
from app.modules.job_cards.models import JobCard
from app.modules.visits.models import Visit

QUEUES = (
    "estimate_unpublished",
    "invoice_missing",
    "payment_missing",
    "consume_gap",
    "qc_incomplete",
)


class CloseoutItemOut(BaseModel):
    job_card_id: str
    job_card_ref: str
    visit_id: str | None = None
    queue: str
    summary: str
    href: str


class CloseoutListOut(BaseModel):
    queue: str
    items: list[CloseoutItemOut] = Field(default_factory=list)


LABOUR_KINDS = {"LABOUR", "SERVICE", "FEE"}
PART_KINDS = {"PART", "REPAIR"}


def money_rollup(estimate: Estimate | None) -> tuple[int, int]:
    if estimate is None:
        return 0, 0
    labour = 0
    parts = 0
    for line in estimate.line_items or []:
        kind = (line.kind or "").upper()
        if kind in PART_KINDS:
            parts += int(line.amount_minor)
        else:
            labour += int(line.amount_minor)
    return labour, parts


def billed_percent(invoice: Invoice | None) -> float | None:
    if invoice is None or invoice.total_minor <= 0:
        return None
    return round(100.0 * invoice.paid_minor / invoice.total_minor, 1)


class CloseoutService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_queue(self, queue: str) -> CloseoutListOut:
        if queue not in QUEUES:
            queue = "estimate_unpublished"
        items: list[CloseoutItemOut] = []
        if queue == "estimate_unpublished":
            items = self._estimate_unpublished()
        elif queue == "invoice_missing":
            items = self._invoice_missing()
        elif queue == "payment_missing":
            items = self._payment_missing()
        elif queue == "consume_gap":
            items = self._consume_gap()
        elif queue == "qc_incomplete":
            items = self._qc_incomplete()
        return CloseoutListOut(queue=queue, items=items)

    def _job_ref(self, job_id: str) -> str:
        job = self.db.get(JobCard, job_id)
        return job.public_ref if job else job_id

    def _estimate_unpublished(self) -> list[CloseoutItemOut]:
        visits = list(
            self.db.scalars(select(Visit).where(Visit.status == "COMPLETED")).all()
        )
        out: list[CloseoutItemOut] = []
        seen: set[str] = set()
        for visit in visits:
            if visit.job_card_id in seen:
                continue
            estimate = self.db.scalar(
                select(Estimate)
                .where(Estimate.job_card_id == visit.job_card_id)
                .order_by(Estimate.version.desc())
            )
            if estimate is None or estimate.status in {"DRAFT", "SUPERSEDED"}:
                seen.add(visit.job_card_id)
                status = estimate.status if estimate else "missing"
                out.append(
                    CloseoutItemOut(
                        job_card_id=visit.job_card_id,
                        job_card_ref=self._job_ref(visit.job_card_id),
                        visit_id=visit.id,
                        queue="estimate_unpublished",
                        summary=f"Visit complete · estimate {status}",
                        href=f"/jobs/{visit.job_card_id}/estimate",
                    )
                )
        return out

    def _invoice_missing(self) -> list[CloseoutItemOut]:
        estimates = list(
            self.db.scalars(select(Estimate).where(Estimate.status == "ACCEPTED")).all()
        )
        out: list[CloseoutItemOut] = []
        for estimate in estimates:
            booking = self.db.scalar(
                select(Booking)
                .where(Booking.job_card_id == estimate.job_card_id)
                .order_by(Booking.created_at.desc())
            )
            if booking is None:
                continue
            invoice = self.db.scalar(select(Invoice).where(Invoice.booking_id == booking.id))
            if invoice is None or invoice.status == "DRAFT":
                out.append(
                    CloseoutItemOut(
                        job_card_id=estimate.job_card_id,
                        job_card_ref=self._job_ref(estimate.job_card_id),
                        queue="invoice_missing",
                        summary="Estimate accepted · invoice missing",
                        href=f"/jobs/{estimate.job_card_id}",
                    )
                )
        return out

    def _payment_missing(self) -> list[CloseoutItemOut]:
        invoices = list(
            self.db.scalars(
                select(Invoice).where(Invoice.status.in_({"ISSUED", "PARTIALLY_PAID"}))
            ).all()
        )
        out: list[CloseoutItemOut] = []
        for invoice in invoices:
            if invoice.balance_minor <= 0:
                continue
            booking = self.db.get(Booking, invoice.booking_id)
            if booking is None:
                continue
            out.append(
                CloseoutItemOut(
                    job_card_id=booking.job_card_id,
                    job_card_ref=self._job_ref(booking.job_card_id),
                    queue="payment_missing",
                    summary=f"Invoice {invoice.invoice_number} · balance due",
                    href="/payments",
                )
            )
        return out

    def _consume_gap(self) -> list[CloseoutItemOut]:
        parts = list(
            self.db.scalars(select(JobPart).where(JobPart.inventory_movement_id.is_(None))).all()
        )
        out: list[CloseoutItemOut] = []
        seen: set[str] = set()
        for part in parts:
            if part.job_card_id in seen:
                continue
            seen.add(part.job_card_id)
            out.append(
                CloseoutItemOut(
                    job_card_id=part.job_card_id,
                    job_card_ref=self._job_ref(part.job_card_id),
                    visit_id=part.visit_id,
                    queue="consume_gap",
                    summary=f"{part.label} recorded without stock movement",
                    href=f"/jobs/{part.job_card_id}/used",
                )
            )
        return out

    def _qc_incomplete(self) -> list[CloseoutItemOut]:
        visits = list(
            self.db.scalars(
                select(Visit).where(Visit.status.in_({"QC_PENDING", "QC_FAILED"}))
            ).all()
        )
        out: list[CloseoutItemOut] = []
        for visit in visits:
            qc = self.db.scalar(select(QcCheck).where(QcCheck.visit_id == visit.id))
            summary = visit.status.replace("_", " ").title()
            if qc is not None and not qc.passed:
                summary = "QC failed"
            out.append(
                CloseoutItemOut(
                    job_card_id=visit.job_card_id,
                    job_card_ref=self._job_ref(visit.job_card_id),
                    visit_id=visit.id,
                    queue="qc_incomplete",
                    summary=summary,
                    href=f"/jobs/{visit.job_card_id}",
                )
            )
        return out
