from __future__ import annotations

from datetime import UTC, datetime, timedelta, timezone
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.common.errors import DomainProblem
from app.config import settings
from app.core.deps import CurrentUser
from app.modules.bookings.models import BookingSnapshot
from app.modules.field_work.models import JobLabour, JobPart, QcCheck
from app.modules.inspections.models import Inspection, InspectionFinding
from app.modules.job_cards.models import JobCard
from app.modules.job_cards.repository import JobCardRepository
from app.modules.media.models import MediaAsset
from app.modules.notifications.models import OutboxEvent
from app.modules.visits.models import TechnicianLocationPing, Visit
from app.modules.visits.repository import VisitRepository
from app.modules.visits.schemas import (
    CompleteVisitBody,
    ExceptionRequest,
    InspectionFindingsRequest,
    LabourRequest,
    LabourResponse,
    LocationBody,
    LocationPingRequest,
    PartsRequest,
    PartsResponse,
    QcRequest,
    ScopeProgressRequest,
    TechnicianMeOut,
    TechnicianScopeLine,
    TechnicianVisitDetail,
    TechnicianVisitSummary,
    VisitListResponse,
    VisitTag,
)
from app.modules.visits.state_machine import build_allowed_actions, transition

IST = timezone(timedelta(hours=5, minutes=30))

TYPE_LABELS = {
    "INSPECTION": "Inspection",
    "SERVICE": "Service",
    "ONE_MAN": "One-man",
    "SOS_ASSIST": "SOS assist",
    "REPAIR": "Repair",
}

PRICE_KEYS = {"amount_minor", "unit_price", "unit_price_minor", "total_minor"}


def mask_phone(phone: str | None) -> str:
    if not phone:
        return ""
    digits = "".join(ch for ch in phone if ch.isdigit())
    if len(digits) >= 12 and digits.startswith("91"):
        national = digits[2:]
    else:
        national = digits[-10:] if len(digits) >= 10 else digits
    if len(national) < 6:
        return phone
    return f"+91 {national[:5]} *****{national[-1]}"


def strip_scope_lines(raw_lines: list) -> list[dict]:
    stripped: list[dict] = []
    for index, line in enumerate(raw_lines):
        if not isinstance(line, dict):
            continue
        kind = str(line.get("kind") or "SERVICE").upper()
        if kind not in {"SERVICE", "REPAIR", "INCLUSION"}:
            kind = "REPAIR" if line.get("is_included") is False else "SERVICE"
        if line.get("is_included") is True:
            kind = "INCLUSION"
        line_id = str(line.get("id") or str(uuid4()))
        stripped.append(
            {
                "id": line_id,
                "label": str(line.get("label") or f"Line {index + 1}"),
                "kind": kind,
                "status": str(line.get("status") or "PENDING"),
            }
        )
    return stripped


def scope_from_snapshot(snapshot: BookingSnapshot | None) -> list[dict]:
    if snapshot is None:
        return []
    estimate = snapshot.estimate_snapshot or {}
    raw = estimate.get("line_items") or estimate.get("scope_lines") or []
    return strip_scope_lines(raw)


class VisitService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = VisitRepository(db)
        self.job_cards = JobCardRepository(db)

    def require_technician(self, user: CurrentUser):
        tech = self.repo.technician_by_profile(user.id)
        if tech is None or tech.status != "active":
            raise DomainProblem(403, "FORBIDDEN", "Not assigned as an active technician.")
        return tech

    def require_assigned_visit(self, visit_id: str, technician_id: str) -> Visit:
        visit = self.repo.get_visit(visit_id)
        if visit is None:
            raise DomainProblem(404, "VISIT_NOT_FOUND", "Visit not found.")
        assignment = self.repo.get_current_assignment(visit_id)
        if assignment is None or assignment.technician_id != technician_id:
            raise DomainProblem(403, "FORBIDDEN", "Not assigned to this visit.")
        return visit

    def list_for_date(self, user: CurrentUser, date_str: str) -> VisitListResponse:
        tech = self.require_technician(user)
        try:
            day = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError as exc:
            raise DomainProblem(422, "INVALID_DATE", "date must be YYYY-MM-DD.") from exc
        start = datetime.combine(day, datetime.min.time(), tzinfo=IST)
        end = start + timedelta(days=1)
        visits = self.repo.list_for_technician(tech.id, start.astimezone(UTC), end.astimezone(UTC))
        summaries = [self._to_summary(visit) for visit in visits]
        completed = sum(1 for row in summaries if row.status == "COMPLETED")
        return VisitListResponse(
            date=date_str,
            timezone="Asia/Kolkata",
            visits=summaries,
            summary={"total": len(summaries), "completed": completed},
        )

    def get_detail(self, user: CurrentUser, visit_id: str) -> TechnicianVisitDetail:
        tech = self.require_technician(user)
        visit = self.require_assigned_visit(visit_id, tech.id)
        return self._to_detail(visit)

    def me(self, user: CurrentUser) -> TechnicianMeOut:
        tech = self.require_technician(user)
        today = datetime.now(IST).date().isoformat()
        listed = self.list_for_date(user, today)
        return TechnicianMeOut(
            technician_id=tech.id,
            display_name=tech.display_name,
            on_duty=tech.on_duty,
            skills=self.repo.skill_codes(tech),
            today_jobs=listed.summary["total"],
            status=tech.status,
        )

    def patch_me(self, user: CurrentUser, on_duty: bool) -> TechnicianMeOut:
        tech = self.require_technician(user)
        tech.on_duty = on_duty
        tech.updated_at = datetime.now(UTC)
        self.db.flush()
        return self.me(user)

    def en_route(
        self, user: CurrentUser, visit_id: str, body: LocationBody
    ) -> TechnicianVisitDetail:
        tech = self.require_technician(user)
        visit = self.require_assigned_visit(visit_id, tech.id)
        transition(visit, "EN_ROUTE")
        visit.updated_at = datetime.now(UTC)
        if body.lat is not None and body.lng is not None:
            self._record_ping(
                tech.id,
                visit.id,
                body.lat,
                body.lng,
                body.accuracy_m,
                datetime.now(UTC),
                str(uuid4()),
                force=True,
            )
        self.job_cards.add_event(
            visit.job_card_id, "VISIT_EN_ROUTE", actor_profile_id=user.id, request_id=None
        )
        self.db.flush()
        return self._to_detail(visit)

    def check_in(
        self, user: CurrentUser, visit_id: str, body: LocationBody
    ) -> TechnicianVisitDetail:
        tech = self.require_technician(user)
        visit = self.require_assigned_visit(visit_id, tech.id)
        transition(visit, "ON_SITE")
        visit.updated_at = datetime.now(UTC)
        self._touch_actual_start(visit)
        self._record_odometer(visit, body.odometer_km, user.id)
        if body.lat is not None and body.lng is not None:
            self._record_ping(
                tech.id,
                visit.id,
                body.lat,
                body.lng,
                body.accuracy_m,
                datetime.now(UTC),
                str(uuid4()),
                force=True,
            )
        self.job_cards.add_event(
            visit.job_card_id, "VISIT_CHECK_IN", actor_profile_id=user.id, request_id=None
        )
        self.db.flush()
        return self._to_detail(visit)

    def start_inspection(self, user: CurrentUser, visit_id: str) -> TechnicianVisitDetail:
        tech = self.require_technician(user)
        visit = self.require_assigned_visit(visit_id, tech.id)
        transition(visit, "INSPECTION_IN_PROGRESS")
        visit.updated_at = datetime.now(UTC)
        self._touch_actual_start(visit)
        inspection = self.db.scalar(select(Inspection).where(Inspection.visit_id == visit.id))
        if inspection is None:
            self.db.add(
                Inspection(visit_id=visit.id, job_card_id=visit.job_card_id, status="draft")
            )
        job_card = self.db.get(JobCard, visit.job_card_id)
        if job_card is not None and job_card.flow_policy == "INSPECTION_REPAIR":
            if job_card.status == "INSPECTION_BOOKED":
                from app.modules.job_cards import state_machine as jc_sm

                jc_sm.transition(job_card, "INSPECTION_IN_PROGRESS")
        visit.updated_at = datetime.now(UTC)
        self.db.flush()
        return self._to_detail(visit)

    def start_service(self, user: CurrentUser, visit_id: str) -> TechnicianVisitDetail:
        tech = self.require_technician(user)
        visit = self.require_assigned_visit(visit_id, tech.id)
        transition(visit, "SERVICE_IN_PROGRESS")
        visit.updated_at = datetime.now(UTC)
        self._touch_actual_start(visit)
        job_card = self.db.get(JobCard, visit.job_card_id)
        if (
            job_card is not None
            and job_card.flow_policy == "INSPECTION_REPAIR"
            and visit.visit_type == "REPAIR"
            and job_card.status == "REPAIR_BOOKED"
        ):
            from app.modules.job_cards import state_machine as jc_sm

            jc_sm.transition(job_card, "REPAIR_IN_PROGRESS")
        self.db.flush()
        return self._to_detail(visit)

    def submit_findings(
        self, user: CurrentUser, visit_id: str, body: InspectionFindingsRequest
    ) -> TechnicianVisitDetail:
        dumped = body.model_dump()
        if any(key in str(dumped).lower() for key in ("unit_cost", "unit_price", "amount_minor")):
            if "recommended_parts" in dumped or "recommended_labour" in dumped:
                blob = str(dumped)
                if any(token in blob for token in ("unit_cost", "unit_price", "amount_minor")):
                    raise DomainProblem(
                        422,
                        "TECHNICIAN_PRICE_FORBIDDEN",
                        "Technicians cannot set selling prices.",
                    )
        tech = self.require_technician(user)
        visit = self.require_assigned_visit(visit_id, tech.id)
        inspection = self.db.scalar(select(Inspection).where(Inspection.visit_id == visit.id))
        if inspection is None:
            inspection = Inspection(
                visit_id=visit.id, job_card_id=visit.job_card_id, status="draft"
            )
            self.db.add(inspection)
            self.db.flush()
        inspection.job_card_id = visit.job_card_id
        inspection.summary = body.summary
        inspection.submitted_by = user.id
        self._assert_media(visit.id, body.media_asset_ids, user.id)
        if body.findings:
            for index, finding in enumerate(body.findings):
                severity = (finding.severity or "MEDIUM").upper()
                self.db.add(
                    InspectionFinding(
                        inspection_id=inspection.id,
                        job_card_id=visit.job_card_id,
                        summary=finding.customer_explanation,
                        title=finding.title,
                        customer_explanation=finding.customer_explanation,
                        recommendation=finding.recommendation,
                        repair_category=finding.repair_category,
                        severity=severity,
                        sort_order=index,
                        media_asset_id=finding.media_asset_id,
                    )
                )
        else:
            self.db.add(
                InspectionFinding(
                    inspection_id=inspection.id,
                    job_card_id=visit.job_card_id,
                    summary=body.summary,
                    title=body.summary,
                    customer_explanation=body.summary,
                    recommendation=body.recommendation,
                    severity=(body.severity or "medium").upper(),
                )
            )
        for part in body.recommended_parts:
            self.db.add(
                JobPart(
                    visit_id=visit.id,
                    job_card_id=visit.job_card_id,
                    sku_code=part.sku_code,
                    label=part.label,
                    quantity=Decimal(str(part.quantity)),
                    notes=part.notes,
                    readiness_status="RECOMMENDED",
                    fitted_at=None,
                    client_event_id=str(uuid4()),
                )
            )
        for labour in body.recommended_labour:
            self.db.add(
                JobLabour(
                    visit_id=visit.id,
                    job_card_id=visit.job_card_id,
                    description=labour.description,
                    minutes=labour.minutes,
                    client_event_id=str(uuid4()),
                )
            )
        inspection.status = "submitted"
        inspection.submitted_at = datetime.now(UTC)
        transition(visit, "INSPECTION_SUBMITTED")
        visit.updated_at = datetime.now(UTC)
        job_card = self.db.get(JobCard, visit.job_card_id)
        if job_card is not None and job_card.flow_policy == "INSPECTION_REPAIR":
            from app.modules.job_cards import state_machine as jc_sm

            if job_card.status == "INSPECTION_BOOKED":
                jc_sm.transition(job_card, "INSPECTION_IN_PROGRESS")
            if job_card.status == "INSPECTION_IN_PROGRESS":
                jc_sm.transition(job_card, "ESTIMATE_PENDING")
        self.job_cards.add_event(
            visit.job_card_id,
            "INSPECTION_FINDINGS",
            actor_profile_id=user.id,
            request_id=None,
            payload={"summary": body.summary, "recommendation": body.recommendation},
        )
        self.db.add(
            OutboxEvent(
                event_type="INSPECTION_FINDINGS_SUBMITTED",
                payload={"job_card_id": visit.job_card_id, "visit_id": visit.id},
            )
        )
        self.db.flush()
        if job_card is not None:
            from app.modules.inspections.service import InspectionService

            InspectionService(self.db).maybe_auto_publish(job_card, user.id)
        self.db.flush()
        return self._to_detail(visit)

    def save_parts(
        self, user: CurrentUser, visit_id: str, body: PartsRequest, event_id: str
    ) -> PartsResponse:
        tech = self.require_technician(user)
        visit = self.require_assigned_visit(visit_id, tech.id)
        if visit.status not in {"SERVICE_IN_PROGRESS", "QC_PENDING"}:
            raise DomainProblem(
                409,
                "INVALID_STATE_TRANSITION",
                "Parts can only be recorded during service or QC.",
                allowed_actions=build_allowed_actions(visit.status, visit.visit_type),
            )
        existing = self.db.scalar(select(JobPart).where(JobPart.client_event_id == event_id))
        if existing is not None:
            recorded = len(
                list(self.db.scalars(select(JobPart).where(JobPart.visit_id == visit.id)).all())
            )
            return PartsResponse(parts_recorded=recorded)
        from app.modules.inventory.service import InventoryService

        inventory = InventoryService(self.db)
        location = tech.van_code if tech.van_code else "VAN_A"
        for index, line in enumerate(body.lines):
            part = JobPart(
                visit_id=visit.id,
                job_card_id=visit.job_card_id,
                sku_code=line.sku_code,
                label=line.label,
                quantity=Decimal(str(line.quantity)),
                notes=line.notes,
                intent=(line.intent or "FIT").upper()
                if getattr(line, "intent", None)
                else "FIT",
                client_event_id=event_id if index == 0 else str(uuid4()),
            )
            self.db.add(part)
            self.db.flush()
            if part.intent == "FIT":
                inventory.consume_for_part(part, user, location=location)
        self.db.flush()
        recorded = len(
            list(self.db.scalars(select(JobPart).where(JobPart.visit_id == visit.id)).all())
        )
        return PartsResponse(parts_recorded=recorded)

    def save_labour(
        self, user: CurrentUser, visit_id: str, body: LabourRequest, event_id: str
    ) -> LabourResponse:
        tech = self.require_technician(user)
        visit = self.require_assigned_visit(visit_id, tech.id)
        if visit.status not in {"SERVICE_IN_PROGRESS"}:
            raise DomainProblem(
                409,
                "INVALID_STATE_TRANSITION",
                "Labour can only be recorded during service.",
                allowed_actions=build_allowed_actions(visit.status, visit.visit_type),
            )
        existing = self.db.scalar(select(JobLabour).where(JobLabour.client_event_id == event_id))
        if existing is not None:
            recorded = len(
                list(self.db.scalars(select(JobLabour).where(JobLabour.visit_id == visit.id)).all())
            )
            return LabourResponse(labour_recorded=recorded)
        for index, entry in enumerate(body.entries):
            self.db.add(
                JobLabour(
                    visit_id=visit.id,
                    job_card_id=visit.job_card_id,
                    description=entry.description,
                    minutes=entry.minutes,
                    client_event_id=event_id if index == 0 else str(uuid4()),
                )
            )
        self.db.flush()
        recorded = len(
            list(self.db.scalars(select(JobLabour).where(JobLabour.visit_id == visit.id)).all())
        )
        return LabourResponse(labour_recorded=recorded)

    def submit_qc(
        self, user: CurrentUser, visit_id: str, body: QcRequest, event_id: str
    ) -> TechnicianVisitDetail:
        tech = self.require_technician(user)
        visit = self.require_assigned_visit(visit_id, tech.id)
        existing = self.db.scalar(select(QcCheck).where(QcCheck.client_event_id == event_id))
        if existing is not None:
            return self._to_detail(visit)
        if visit.status == "SERVICE_IN_PROGRESS":
            transition(visit, "QC_PENDING")
        items = [item.model_dump() for item in body.items]
        all_passed = body.passed and all(item.passed for item in body.items)
        self.db.add(
            QcCheck(
                visit_id=visit.id,
                checklist_version=body.checklist_version,
                items=items,
                passed=all_passed,
                client_event_id=event_id,
            )
        )
        if all_passed:
            transition(visit, "COMPLETED")
        else:
            transition(visit, "QC_FAILED")
        visit.updated_at = datetime.now(UTC)
        self.job_cards.add_event(
            visit.job_card_id,
            "QC_SUBMITTED",
            actor_profile_id=user.id,
            request_id=None,
            payload={"passed": all_passed},
        )
        if visit.status == "COMPLETED":
            self._mark_job_visit_complete(visit, user.id)
        self.db.flush()
        return self._to_detail(visit)

    def complete(
        self,
        user: CurrentUser,
        visit_id: str,
        body: CompleteVisitBody | None = None,
    ) -> TechnicianVisitDetail:
        tech = self.require_technician(user)
        visit = self.require_assigned_visit(visit_id, tech.id)
        if visit.status == "COMPLETED":
            return self._to_detail(visit)
        if visit.status == "SERVICE_IN_PROGRESS":
            transition(visit, "QC_PENDING")
        transition(visit, "COMPLETED")
        visit.updated_at = datetime.now(UTC)
        if visit.actual_finish_at is None:
            visit.actual_finish_at = datetime.now(UTC)
        odo = body.odometer_km if body is not None else None
        self._record_odometer(visit, odo, user.id)
        self._append_service_log(visit, odo)
        self._mark_job_visit_complete(visit, user.id)
        self.db.flush()
        return self._to_detail(visit)

    def raise_exception(
        self, user: CurrentUser, visit_id: str, body: ExceptionRequest
    ) -> TechnicianVisitDetail:
        tech = self.require_technician(user)
        visit = self.require_assigned_visit(visit_id, tech.id)
        self._assert_media(visit.id, body.media_asset_ids, user.id)
        transition(visit, "SUPPORT_REQUIRED")
        visit.updated_at = datetime.now(UTC)
        self.job_cards.add_event(
            visit.job_card_id,
            "SCOPE_EXCEPTION",
            actor_profile_id=user.id,
            request_id=None,
            payload={
                "summary": body.summary,
                "requested_action": body.requested_action,
                "visit_id": visit.id,
            },
        )
        self.db.flush()
        return self._to_detail(visit)

    def update_scope_progress(
        self, user: CurrentUser, visit_id: str, body: ScopeProgressRequest
    ) -> TechnicianVisitDetail:
        tech = self.require_technician(user)
        visit = self.require_assigned_visit(visit_id, tech.id)
        if visit.status not in {"SERVICE_IN_PROGRESS", "ON_SITE", "QC_PENDING", "QC_FAILED"}:
            raise DomainProblem(
                409,
                "INVALID_STATE_TRANSITION",
                "Scope lines can only be updated during the service visit.",
            )
        lines = list(visit.scope_lines or [])
        found = False
        for line in lines:
            if str(line.get("id")) == body.line_id:
                line["status"] = body.status
                found = True
                break
        if not found:
            raise DomainProblem(404, "NOT_FOUND", "Scope line not found.")
        visit.scope_lines = lines
        flag_modified(visit, "scope_lines")
        visit.updated_at = datetime.now(UTC)
        self.db.flush()
        return self._to_detail(visit)

    def location_ping(self, user: CurrentUser, body: LocationPingRequest) -> None:
        tech = self.require_technician(user)
        existing = self.db.scalar(
            select(TechnicianLocationPing).where(
                TechnicianLocationPing.client_event_id == body.client_event_id
            )
        )
        if existing is not None:
            return
        if body.visit_id:
            self.require_assigned_visit(body.visit_id, tech.id)
        self._record_ping(
            tech.id,
            body.visit_id,
            body.lat,
            body.lng,
            body.accuracy_m,
            body.recorded_at,
            body.client_event_id,
            force=body.force,
        )
        self.db.flush()

    def _record_ping(
        self,
        technician_id: str,
        visit_id: str | None,
        lat: float,
        lng: float,
        accuracy_m: float | None,
        recorded_at: datetime,
        client_event_id: str,
        *,
        force: bool,
    ) -> None:
        last = self.repo.last_ping_at(technician_id)
        if last is not None and not force:
            last_aware = last if last.tzinfo else last.replace(tzinfo=UTC)
            recorded = recorded_at if recorded_at.tzinfo else recorded_at.replace(tzinfo=UTC)
            min_interval = timedelta(seconds=settings.tech_location_ping_min_interval_seconds)
            if recorded - last_aware < min_interval:
                raise DomainProblem(
                    429,
                    "RATE_LIMITED",
                    "Location pings are throttled. Wait before sending another ping.",
                    retryable=True,
                )
        self.db.add(
            TechnicianLocationPing(
                technician_id=technician_id,
                visit_id=visit_id,
                lat=lat,
                lng=lng,
                accuracy_m=accuracy_m,
                recorded_at=recorded_at if recorded_at.tzinfo else recorded_at.replace(tzinfo=UTC),
                client_event_id=client_event_id,
            )
        )

    def _assert_media(self, visit_id: str, asset_ids: list[str], uploader_id: str) -> None:
        for asset_id in asset_ids:
            asset = self.db.get(MediaAsset, asset_id)
            if asset is None or asset.visit_id != visit_id:
                raise DomainProblem(
                    422, "INVALID_MEDIA", "Media asset is not linked to this visit."
                )
            if asset.uploader_profile_id != uploader_id:
                raise DomainProblem(403, "FORBIDDEN", "Media asset belongs to another uploader.")

    def _mark_job_visit_complete(self, visit: Visit, actor_id: str) -> None:
        self.job_cards.add_event(
            visit.job_card_id, "VISIT_COMPLETED", actor_profile_id=actor_id, request_id=None
        )
        job = self.db.get(JobCard, visit.job_card_id)
        if job is not None and job.status == "BOOKING_CREATED":
            job.status = "IN_SERVICE"
            job.updated_at = datetime.now(UTC)
        from app.modules.bookings.models import Booking
        from app.modules.notifications.service import enqueue_intent

        booking = self.db.get(Booking, visit.booking_id)
        if booking is not None:
            enqueue_intent(
                self.db,
                profile_id=booking.profile_id,
                intent="visit_complete",
                entity_type="booking",
                entity_id=booking.id,
                context={
                    "service_name": "your visit",
                    "booking_id": booking.id,
                    "visit_id": visit.id,
                },
            )
        self._maybe_issue_invoice(visit)

    def _touch_actual_start(self, visit: Visit) -> None:
        if visit.actual_start_at is None:
            visit.actual_start_at = datetime.now(UTC)

    def _record_odometer(self, visit: Visit, odometer_km: int | None, actor_id: str) -> None:
        if odometer_km is None:
            return
        if odometer_km <= 0:
            raise DomainProblem(422, "INVALID_ODOMETER", "Odometer must be greater than zero.")
        job = self.db.get(JobCard, visit.job_card_id)
        if job is None or not job.vehicle_id:
            return
        from app.modules.vehicles.models import Vehicle

        vehicle = self.db.get(Vehicle, job.vehicle_id)
        if vehicle is None:
            return
        vehicle.mileage_km = odometer_km
        vehicle.updated_at = datetime.now(UTC)

    def _append_service_log(self, visit: Visit, odometer_km: int | None) -> None:
        job = self.db.get(JobCard, visit.job_card_id)
        if job is None or not job.vehicle_id:
            return
        from app.db.models import ServiceOffering
        from app.modules.invoices.models import Invoice
        from app.modules.vehicles.models import VehicleServiceLog
        from app.modules.bookings.models import Booking

        offering = self.db.get(ServiceOffering, job.service_offering_id)
        booking = self.db.get(Booking, visit.booking_id)
        total = None
        if booking is not None:
            invoice = self.db.scalar(select(Invoice).where(Invoice.booking_id == booking.id))
            if invoice is not None:
                total = invoice.total_minor
        self.db.add(
            VehicleServiceLog(
                vehicle_id=job.vehicle_id,
                visit_id=visit.id,
                offering_slug=offering.slug if offering else None,
                invoice_total_minor=total,
                odometer_km=odometer_km,
                notes=None,
            )
        )

    def _maybe_issue_invoice(self, visit: Visit) -> None:
        from app.modules.bookings.models import Booking
        from app.modules.invoices.service import InvoiceService, should_auto_issue_invoice

        visits = list(
            self.db.scalars(select(Visit).where(Visit.job_card_id == visit.job_card_id)).all()
        )
        booking = self.db.get(Booking, visit.booking_id)
        if booking is None:
            return
        if not should_auto_issue_invoice(booking, visits):
            return
        for row in visits:
            related = self.db.get(Booking, row.booking_id)
            if related is not None and related.status not in {"CANCELLED", "COMPLETED"}:
                related.status = "COMPLETED"
                related.updated_at = datetime.now(UTC)
        job = self.db.get(JobCard, visit.job_card_id)
        if job is not None and job.status != "COMPLETED":
            from app.modules.job_cards import state_machine as job_sm

            if job.status == "BOOKING_CREATED":
                job_sm.transition(job, "IN_SERVICE")
            if job_sm.can_transition(job.status, "COMPLETED"):
                job_sm.transition(job, "COMPLETED")
            elif job.status != "COMPLETED":
                job.status = "COMPLETED"
            job.updated_at = datetime.now(UTC)
        try:
            InvoiceService(self.db).issue_for_booking(booking.id)
        except DomainProblem:
            pass

    def _to_summary(self, visit: Visit) -> TechnicianVisitSummary:
        snapshot = self.db.scalar(
            select(BookingSnapshot).where(BookingSnapshot.booking_id == visit.booking_id)
        )
        job = self.db.get(JobCard, visit.job_card_id)
        start = visit.scheduled_start_at
        if start.tzinfo is None:
            start = start.replace(tzinfo=UTC)
        local_start = start.astimezone(IST)
        type_label = visit.display_type_label or TYPE_LABELS.get(
            visit.visit_type, visit.visit_type.title()
        )
        vehicle = (snapshot.vehicle_snapshot if snapshot else {}) or {}
        address = (snapshot.address_snapshot if snapshot else {}) or {}
        vehicle_label = (
            " ".join(str(part) for part in (vehicle.get("make"), vehicle.get("model")) if part)
            or "Vehicle"
        )
        return TechnicianVisitSummary(
            id=visit.id,
            public_ref=visit.public_ref,
            job_card_ref=job.public_ref if job else "",
            visit_type=visit.visit_type,
            status=visit.status,
            scheduled_label=f"{local_start.strftime('%H:%M')} · {type_label}",
            distance_km=visit.distance_km,
            vehicle_label=vehicle_label,
            address_short=str(address.get("locality") or address.get("line1") or ""),
            allowed_actions=build_allowed_actions(visit.status, visit.visit_type),
        )

    def _to_detail(self, visit: Visit) -> TechnicianVisitDetail:
        summary = self._to_summary(visit)
        snapshot = self.db.scalar(
            select(BookingSnapshot).where(BookingSnapshot.booking_id == visit.booking_id)
        )
        job = self.db.get(JobCard, visit.job_card_id)
        start = visit.scheduled_start_at
        end = visit.scheduled_end_at
        if start.tzinfo is None:
            start = start.replace(tzinfo=UTC)
        if end.tzinfo is None:
            end = end.replace(tzinfo=UTC)
        local_start = start.astimezone(IST)
        local_end = end.astimezone(IST)
        customer = (snapshot.customer_snapshot if snapshot else {}) or {}
        address = (snapshot.address_snapshot if snapshot else {}) or {}
        vehicle = (snapshot.vehicle_snapshot if snapshot else {}) or {}
        concerns = None
        if job is not None:
            texts = [row.text for row in job.concerns]
            concerns = " · ".join(texts) if texts else None
        vehicle_bits = [
            vehicle.get("make"),
            vehicle.get("model"),
            str(vehicle.get("year")) if vehicle.get("year") else None,
        ]
        fuel = vehicle.get("fuel_type")
        vehicle_label = " ".join(str(bit) for bit in vehicle_bits if bit)
        if fuel:
            vehicle_label = f"{vehicle_label} · {str(fuel).title()}"
        address_full = ", ".join(
            str(part) for part in (address.get("line1"), address.get("locality")) if part
        )
        kinds = {str(line.get("kind")) for line in (visit.scope_lines or [])}
        tags: list[VisitTag] = []
        if "REPAIR" in kinds and "SERVICE" in kinds:
            tags.append(VisitTag(code="SERVICE_REPAIR", label="Service + repair"))
        elif visit.visit_type == "ONE_MAN":
            tags.append(VisitTag(code="ONE_MAN", label="One-man"))
        elif visit.visit_type == "INSPECTION":
            tags.append(VisitTag(code="INSPECTION", label="Inspection"))
        else:
            tags.append(
                VisitTag(
                    code=visit.visit_type,
                    label=TYPE_LABELS.get(visit.visit_type, visit.visit_type),
                )
            )
        tags.append(VisitTag(code="APPROVED", label="Approved"))
        lines = [
            TechnicianScopeLine(
                id=str(line.get("id")),
                label=str(line.get("label")),
                kind=str(line.get("kind") or "SERVICE"),
                status=str(line.get("status") or "PENDING"),
            )
            for line in (visit.scope_lines or [])
        ]
        data = summary.model_dump()
        data.update(
            {
                "scheduled_label": (
                    f"{local_start.strftime('%a')} {local_start.strftime('%H:%M')}"
                    f" – {local_end.strftime('%H:%M')}"
                ),
                "vehicle_label": vehicle_label or summary.vehicle_label,
                "concerns": concerns,
                "scope_lines": lines,
                "advisor_note": visit.advisor_note,
                "customer_name": str(customer.get("full_name") or "Customer").split(" ")[0],
                "customer_phone_masked": mask_phone(customer.get("phone")),
                "address_full": address_full or summary.address_short,
                "parking_notes": visit.parking_notes,
                "map_preview_url": None,
                "tags": tags,
                "plate": (
                    vehicle.get("registration")
                    if isinstance(vehicle.get("registration"), str)
                    else None
                ),
                "latitude": (
                    address.get("latitude")
                    if isinstance(address.get("latitude"), int | float)
                    else None
                ),
                "longitude": (
                    address.get("longitude")
                    if isinstance(address.get("longitude"), int | float)
                    else None
                ),
                "kit": None,
                "actual_start_at": visit.actual_start_at,
                "actual_finish_at": visit.actual_finish_at,
            }
        )
        from app.modules.catalog.kit_service import KitService

        data["kit"] = KitService(self.db).kit_for_visit(visit)
        detail = TechnicianVisitDetail.model_validate(data)
        dumped = detail.model_dump()
        for key in PRICE_KEYS:
            assert key not in dumped
            for line in dumped["scope_lines"]:
                assert key not in line
        return detail
