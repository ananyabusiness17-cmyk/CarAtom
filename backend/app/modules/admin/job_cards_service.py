from datetime import UTC, datetime

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.common.errors import DomainProblem
from app.core.deps import CurrentUser
from app.core.time import IST
from app.db.models import Profile, ServiceOffering
from app.modules.admin.schemas import (
    AdminJobListItem,
    AdminJobListResponse,
    AdminJobLiteLineOut,
    AdminJobLiteOut,
    AdminJobPatchRequest,
    AssignedTechnicianOut,
)
from app.modules.audit.service import AuditService
from app.modules.bookings.models import Booking
from app.modules.estimates.models import Estimate, EstimateLineItem
from app.modules.invoices.models import Invoice
from app.modules.job_cards.models import JobCard, JobCardConcern, JobCardItem
from app.modules.job_cards.schemas import ConcernIn
from app.modules.job_cards.service import JobCardService
from app.modules.technicians.models import Technician
from app.modules.visits.models import TechnicianAssignment, Visit

STATUS_LABELS = {
    "UNASSIGNED": "Unassigned",
    "INSPECTING": "Inspecting",
    "INSPECTION_IN_PROGRESS": "Inspecting",
    "PARTS_ADVANCE": "Parts advance",
    "PARTS_ADVANCE_DUE": "Parts advance",
    "PARTS_PENDING": "Parts advance",
    "SERVICE_IN_PROGRESS": "In progress",
    "IN_SERVICE": "In progress",
    "COMPLETED": "Completed",
    "CANCELLED": "Cancelled",
}

POLICY_LABELS = {
    "GENERAL_SERVICE": "General service",
    "ONE_MAN": "One-man",
    "INSPECTION_REPAIR": "Inspect+repair",
}

LITE_LINE_CAP = 5


def _aware(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


def visit_window_label(start: datetime | None, end: datetime | None) -> str | None:
    start_local = _aware(start)
    if start_local is None:
        return None
    start_ist = start_local.astimezone(IST)
    end_local = _aware(end)
    end_ist = end_local.astimezone(IST) if end_local else None
    day = start_ist.strftime("%a")
    start_t = start_ist.strftime("%H:%M")
    end_t = end_ist.strftime("%H:%M") if end_ist else ""
    window = f"{start_t}–{end_t}" if end_t else start_t
    return f"{day} {start_ist.day} · {window}"


def vehicle_label(ctx: dict | None) -> str:
    data = ctx or {}
    model = str(data.get("model") or "").strip()
    make = str(data.get("make") or "").strip()
    if model:
        return model
    if make:
        return make
    return "Vehicle"


class AdminJobService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.jobs = JobCardService(db)
        self.audit = AuditService(db)

    def list_jobs(
        self,
        *,
        q: str | None = None,
        status: str | None = None,
        cursor: str | None = None,
        limit: int = 50,
        technician_id: str | None = None,
        area_slug: str | None = None,
        needs_dispatch: bool | None = None,
    ) -> AdminJobListResponse:
        query = select(JobCard).order_by(JobCard.updated_at.desc(), JobCard.id.desc())
        if status:
            statuses = [s.strip() for s in status.split(",") if s.strip()]
            if statuses:
                query = query.where(JobCard.status.in_(statuses))
        if q:
            like = f"%{q}%"
            query = query.where(or_(JobCard.public_ref.like(like), JobCard.status.like(like)))
        if cursor:
            updated, row_id = _decode_cursor(cursor)
            query = query.where(
                (JobCard.updated_at < updated)
                | ((JobCard.updated_at == updated) & (JobCard.id < row_id))
            )
        rows = list(self.db.scalars(query.limit(limit + 1)).all())
        items: list[AdminJobListItem] = []
        for job in rows[:limit]:
            item = self._to_board_item(job)
            if technician_id and (
                item.assigned_technician is None or item.assigned_technician.id != technician_id
            ):
                continue
            if area_slug and area_slug.lower() not in (item.area_label or "").lower():
                continue
            if needs_dispatch is True and not item.needs_dispatch:
                continue
            if needs_dispatch is False and item.needs_dispatch:
                continue
            items.append(item)
        next_cursor = None
        if len(rows) > limit:
            last = rows[limit - 1]
            stamp = _aware(last.updated_at) or datetime.now(UTC)
            next_cursor = f"{stamp.isoformat()}|{last.id}"
        return AdminJobListResponse(items=items, next_cursor=next_cursor)

    def get_lite(self, job_card_id: str) -> AdminJobLiteOut:
        job = self.db.get(JobCard, job_card_id)
        if job is None:
            raise DomainProblem(404, "NOT_FOUND", "Job card not found.")
        board = self._to_board_item(job)
        concerns = [
            row.text
            for row in self.db.scalars(
                select(JobCardConcern)
                .where(JobCardConcern.job_card_id == job.id)
                .order_by(JobCardConcern.sort_order.asc())
            ).all()
        ]
        lines = self._lite_lines(job.id)
        shown = lines[:LITE_LINE_CAP]
        visit = self._latest_visit(job.id)
        van_label = None
        if board.assigned_technician is not None:
            tech = self.db.get(Technician, board.assigned_technician.id)
            van_label = tech.van_code if tech and tech.van_code else None
        payload = board.model_dump()
        payload["visit_id"] = visit.id if visit else board.visit_id
        return AdminJobLiteOut(
            **payload,
            concerns=concerns,
            lines=shown,
            lines_omitted_count=max(len(lines) - len(shown), 0),
            van_label=van_label,
            allowed_status_targets=sorted(STATUS_LABELS.keys()),
        )

    def patch(
        self,
        job_card_id: str,
        body: AdminJobPatchRequest,
        actor: CurrentUser,
        request_id: str | None,
    ):
        job = self.jobs.get_accessible(job_card_id, actor)
        if body.concerns is not None:
            texts = [ConcernIn.model_validate(row) for row in body.concerns]
            self.jobs.repo.replace_concerns(job, [row.text for row in texts])
        job.updated_at = datetime.now(UTC)
        self.jobs.repo.add_event(
            job.id,
            "ADMIN_PATCH",
            actor_profile_id=actor.id,
            request_id=request_id,
        )
        self.audit.record(
            actor,
            "jobs.patch",
            "job_card",
            job.public_ref,
            after={"concerns": len(body.concerns or [])},
            request_id=request_id,
        )
        loaded = self.jobs.repo.get(job.id)
        assert loaded is not None
        return self.jobs.to_job_card_out(loaded)

    def _to_board_item(self, job: JobCard) -> AdminJobListItem:
        profile = self.db.get(Profile, job.profile_id) if job.profile_id else None
        visit = self._latest_visit(job.id)
        assignment = None
        tech = None
        if visit is not None:
            assignment = self.db.scalar(
                select(TechnicianAssignment).where(
                    TechnicianAssignment.visit_id == visit.id,
                    TechnicianAssignment.is_current.is_(True),
                )
            )
            if assignment is not None:
                tech = self.db.get(Technician, assignment.technician_id)
        booking = self.db.scalar(
            select(Booking).where(Booking.job_card_id == job.id).order_by(Booking.created_at.desc())
        )
        invoice = None
        if booking is not None:
            invoice = self.db.scalar(
                select(Invoice).where(Invoice.booking_id == booking.id, Invoice.status != "VOID")
            )
        estimate = self.db.scalar(
            select(Estimate).where(Estimate.job_card_id == job.id).order_by(Estimate.version.desc())
        )
        offering = self.db.get(ServiceOffering, job.service_offering_id)
        ctx = job.vehicle_context or {}
        locality = str(ctx.get("locality") or "Koramangala")
        needs_dispatch = assignment is None
        payment_chip = _payment_chip(job.status, invoice.status if invoice else None)
        visit_status = visit.status if visit else None
        status_label = _status_label(job.status, visit_status, needs_dispatch, payment_chip)
        policy = (offering.flow_policy if offering else job.flow_policy) or job.flow_policy
        assigned = (
            AssignedTechnicianOut(id=tech.id, name=tech.display_name) if tech is not None else None
        )
        window_start = (
            visit.scheduled_start_at if visit else (booking.slot_starts_at if booking else None)
        )
        window_end = (
            visit.scheduled_end_at if visit else (booking.slot_ends_at if booking else None)
        )
        return AdminJobListItem(
            id=job.id,
            public_ref=job.public_ref,
            ref=job.public_ref,
            customer_name=profile.full_name if profile else None,
            status=job.status,
            status_label=status_label,
            policy_label=POLICY_LABELS.get(policy, policy.replace("_", " ").title()),
            vehicle_label=vehicle_label(ctx),
            area_label=locality,
            visit_window_label=visit_window_label(window_start, window_end),
            assigned_technician=assigned,
            estimate_total_minor=estimate.total_minor if estimate else None,
            payment_chip=payment_chip,
            needs_dispatch=needs_dispatch,
            visit_id=visit.id if visit else None,
            technician_name=tech.display_name if tech else None,
            locality=locality,
            updated_at=job.updated_at,
            payment_status=invoice.status if invoice else None,
        )

    def _latest_visit(self, job_card_id: str) -> Visit | None:
        return self.db.scalar(
            select(Visit).where(Visit.job_card_id == job_card_id).order_by(Visit.created_at.desc())
        )

    def _lite_lines(self, job_card_id: str) -> list[AdminJobLiteLineOut]:
        estimate = self.db.scalar(
            select(Estimate)
            .where(Estimate.job_card_id == job_card_id)
            .order_by(Estimate.version.desc())
        )
        if estimate is not None:
            rows = list(
                self.db.scalars(
                    select(EstimateLineItem)
                    .where(EstimateLineItem.estimate_id == estimate.id)
                    .order_by(EstimateLineItem.sort_order.asc())
                ).all()
            )
            if rows:
                return [
                    AdminJobLiteLineOut(name=row.label, amount_minor=row.amount_minor)
                    for row in rows
                ]
        items = list(
            self.db.scalars(select(JobCardItem).where(JobCardItem.job_card_id == job_card_id)).all()
        )
        return [
            AdminJobLiteLineOut(name=row.label_snapshot, amount_minor=row.unit_price_minor)
            for row in items
        ]


def _status_label(
    job_status: str, visit_status: str | None, needs_dispatch: bool, payment_chip: str | None
) -> str:
    if needs_dispatch:
        return "Unassigned"
    if payment_chip == "Parts advance":
        return "Parts advance"
    if visit_status and visit_status in STATUS_LABELS:
        return STATUS_LABELS[visit_status]
    if job_status in STATUS_LABELS:
        return STATUS_LABELS[job_status]
    return job_status.replace("_", " ").title()


def _payment_chip(job_status: str, invoice_status: str | None) -> str | None:
    if job_status in {"PARTS_ADVANCE", "PARTS_ADVANCE_DUE", "PARTS_PENDING"}:
        return "Parts advance"
    if invoice_status in {"PARTIALLY_PAID"}:
        return "Parts advance"
    if invoice_status == "PAID":
        return "Paid"
    return None


def _decode_cursor(cursor: str) -> tuple[datetime, str]:
    created_raw, _, row_id = cursor.partition("|")
    if not created_raw or not row_id:
        raise DomainProblem(400, "INVALID_CURSOR", "Pagination cursor is invalid.")
    try:
        created = datetime.fromisoformat(created_raw)
    except ValueError as exc:
        raise DomainProblem(400, "INVALID_CURSOR", "Pagination cursor is invalid.") from exc
    if created.tzinfo is None:
        created = created.replace(tzinfo=UTC)
    return created, row_id
