from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common.errors import DomainProblem
from app.core.deps import CurrentUser
from app.core.refs import next_visit_ref
from app.modules.admin.job_cards_service import vehicle_label, visit_window_label
from app.modules.admin.schemas import (
    DispatchBoardOut,
    DispatchLaneVisitOut,
    DispatchTechnicianOut,
    DispatchUnassignedJobOut,
)
from app.modules.advisor.models import AdvisorNote
from app.modules.audit.service import AuditService
from app.modules.bookings.models import Booking, BookingSnapshot
from app.modules.catalog.kit_service import KitService
from app.modules.job_cards.models import JobCard
from app.modules.job_cards.repository import JobCardRepository
from app.modules.notifications.models import OutboxEvent
from app.modules.technicians.models import Technician, TechnicianSkill
from app.modules.visits.models import (
    TechnicianAssignment,
    TechnicianLocationPing,
    Visit,
)
from app.modules.visits.repository import VisitRepository
from app.modules.visits.schemas import AssignResponse
from app.modules.visits.service import scope_from_snapshot
from app.modules.visits.state_machine import transition


def infer_visit_type(
    snapshot: BookingSnapshot | None, booking: Booking, requested: str | None
) -> str:
    if requested in {"INSPECTION", "SERVICE", "ONE_MAN", "SOS_ASSIST", "REPAIR"}:
        return requested
    if booking.visit_type in {"INSPECTION", "SERVICE", "ONE_MAN", "SOS_ASSIST", "REPAIR"}:
        if booking.visit_type != "SERVICE":
            return booking.visit_type
    policy = (snapshot.flow_policy if snapshot else None) or ""
    if policy == "ONE_MAN":
        return "ONE_MAN"
    if policy == "INSPECTION_REPAIR":
        return "INSPECTION"
    return "SERVICE"


class DispatchService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.visits = VisitRepository(db)
        self.job_cards = JobCardRepository(db)

    def assign_technician_to_booking(
        self,
        booking_id: str,
        technician_id: str,
        actor_admin_id: str,
        *,
        visit_type: str | None = None,
    ) -> Visit:
        booking = self.db.get(Booking, booking_id)
        if booking is None:
            raise DomainProblem(404, "NOT_FOUND", "Booking not found.")
        if booking.status not in {"CONFIRMED", "ASSIGNED"}:
            raise DomainProblem(409, "INVALID_STATE", "Only confirmed bookings can be assigned.")
        tech = self.visits.technician_by_id(technician_id)
        if tech is None or tech.status != "active":
            raise DomainProblem(404, "NOT_FOUND", "Technician not found.")
        if not tech.on_duty:
            raise DomainProblem(
                409,
                "TECH_OFF_DUTY",
                (
                    f"{tech.display_name} is off duty. "
                    "Choose another technician or mark on duty on web."
                ),
            )
        snapshot = self.db.scalar(
            select(BookingSnapshot).where(BookingSnapshot.booking_id == booking.id)
        )
        existing = self.db.scalar(select(Visit).where(Visit.booking_id == booking.id))
        if existing is not None and existing.status in {"COMPLETED", "CANCELLED"}:
            raise DomainProblem(
                409,
                "VISIT_NOT_ASSIGNABLE",
                f"Visit in {existing.status} cannot be assigned.",
            )
        overlapping = self.visits.overlapping(
            technician_id,
            booking.slot_starts_at,
            booking.slot_ends_at,
            exclude_visit_id=existing.id if existing else None,
        )
        if overlapping:
            conflict = overlapping[0]
            raise DomainProblem(
                409,
                "SCHEDULE_OVERLAP",
                (
                    f"Overlap with visit {conflict.public_ref} "
                    f"({conflict.scheduled_start_at} – {conflict.scheduled_end_at}) "
                    f"for {tech.display_name}."
                ),
                details={
                    "conflicting_visit_id": conflict.id,
                    "conflicting_public_ref": conflict.public_ref,
                    "technician_id": tech.id,
                    "technician_name": tech.display_name,
                    "scheduled_start_at": conflict.scheduled_start_at.isoformat(),
                    "scheduled_end_at": conflict.scheduled_end_at.isoformat(),
                },
            )
        if existing is not None:
            current = self.visits.get_current_assignment(existing.id)
            if current and current.technician_id == technician_id:
                return existing
            if current:
                current.is_current = False
                current.unassigned_at = datetime.now(UTC)
            self.db.add(
                TechnicianAssignment(
                    visit_id=existing.id, technician_id=technician_id, is_current=True
                )
            )
            if existing.status in {"SCHEDULED", "UNASSIGNED"}:
                transition(existing, "ASSIGNED")
            existing.updated_at = datetime.now(UTC)
            self._enqueue_assigned(existing, technician_id, actor_admin_id)
            self.db.flush()
            return existing

        resolved_type = infer_visit_type(snapshot, booking, visit_type)
        job = self.db.get(JobCard, booking.job_card_id)
        job_ref = job.public_ref if job else "JC"
        existing_visits = self.db.scalars(
            select(Visit).where(Visit.job_card_id == booking.job_card_id)
        )
        sequence = 1 + len(list(existing_visits))
        visit = Visit(
            public_ref=next_visit_ref(self.db, job_ref, sequence),
            booking_id=booking.id,
            job_card_id=booking.job_card_id,
            visit_type=resolved_type,
            status="ASSIGNED",
            scheduled_start_at=booking.slot_starts_at,
            scheduled_end_at=booking.slot_ends_at,
            timezone=booking.timezone or "Asia/Kolkata",
            scope_lines=scope_from_snapshot(snapshot),
            advisor_note=self._advisor_note(booking.job_card_id),
        )
        self.db.add(visit)
        self.db.flush()
        self.db.add(
            TechnicianAssignment(visit_id=visit.id, technician_id=technician_id, is_current=True)
        )
        self.job_cards.add_event(
            booking.job_card_id,
            "VISIT_ASSIGNED",
            actor_profile_id=actor_admin_id,
            request_id=None,
            payload={"visit_id": visit.id, "technician_id": technician_id},
        )
        self._enqueue_assigned(visit, technician_id, actor_admin_id)
        self.db.flush()
        return visit

    def assign_to_job_card(
        self,
        job_card_id: str,
        technician_id: str,
        admin: CurrentUser,
        visit_type: str | None = None,
        reason: str | None = None,
        client_surface: str | None = None,
    ) -> AssignResponse:
        booking = self.db.scalar(
            select(Booking)
            .where(Booking.job_card_id == job_card_id)
            .order_by(Booking.created_at.desc())
        )
        if booking is None:
            raise DomainProblem(404, "NOT_FOUND", "No booking found for this job card.")
        existing_visit = self.db.scalar(select(Visit).where(Visit.booking_id == booking.id))
        previous_tech = None
        if existing_visit is not None:
            current = self.visits.get_current_assignment(existing_visit.id)
            if current is not None:
                previous_tech = current.technician_id
        visit = self.assign_technician_to_booking(
            booking.id, technician_id, admin.id, visit_type=visit_type
        )
        audit_id = AuditService(self.db).record(
            admin,
            "dispatch.assign",
            "visit",
            visit.public_ref,
            reason=reason,
            before={"technician_id": previous_tech},
            after={"technician_id": technician_id, "client_surface": client_surface},
        )
        kit = None
        warnings: list[str] = []
        job = self.db.get(JobCard, job_card_id)
        if job is not None:
            tech = self.db.get(Technician, technician_id)
            kit = KitService(self.db).kit_for_job(
                job, van_code=tech.van_code if tech else None, visit_id=visit.id
            )
            warnings = list(kit.warnings)
        return AssignResponse(
            visit_id=visit.id,
            public_ref=visit.public_ref,
            status=visit.status,
            visit_type=visit.visit_type,
            audit_ref=audit_id,
            warnings=warnings,
            kit=kit,
        )

    def board(self) -> DispatchBoardOut:
        techs = list(
            self.db.scalars(select(Technician).order_by(Technician.display_name.asc())).all()
        )
        technicians: list[DispatchTechnicianOut] = []
        for tech in techs:
            skills = [
                row.skill_code
                for row in self.db.scalars(
                    select(TechnicianSkill).where(TechnicianSkill.technician_id == tech.id)
                ).all()
            ]
            assignments = list(
                self.db.scalars(
                    select(TechnicianAssignment).where(
                        TechnicianAssignment.technician_id == tech.id,
                        TechnicianAssignment.is_current.is_(True),
                    )
                ).all()
            )
            count = 0
            area = None
            lane: list[DispatchLaneVisitOut] = []
            for assignment in assignments:
                visit = self.db.get(Visit, assignment.visit_id)
                if visit is None or visit.status in {"COMPLETED", "CANCELLED"}:
                    continue
                count += 1
                job = self.db.get(JobCard, visit.job_card_id)
                ctx = job.vehicle_context if job else {}
                if area is None:
                    area = str((ctx or {}).get("locality") or "Koramangala")
                snapshot = self.db.scalar(
                    select(BookingSnapshot).where(BookingSnapshot.booking_id == visit.booking_id)
                )
                address = (snapshot.address_snapshot if snapshot else {}) or {}
                lat = address.get("latitude")
                lng = address.get("longitude")
                lane.append(
                    DispatchLaneVisitOut(
                        visit_id=visit.id,
                        job_card_id=visit.job_card_id,
                        job_card_ref=job.public_ref if job else visit.public_ref,
                        vehicle_label=vehicle_label(ctx),
                        visit_window_label=visit_window_label(
                            visit.scheduled_start_at, visit.scheduled_end_at
                        ),
                        status=visit.status,
                        scheduled_start_at=visit.scheduled_start_at,
                        scheduled_end_at=visit.scheduled_end_at,
                        latitude=float(lat) if lat is not None else None,
                        longitude=float(lng) if lng is not None else None,
                    )
                )
            ping = self.db.scalar(
                select(TechnicianLocationPing)
                .where(TechnicianLocationPing.technician_id == tech.id)
                .order_by(TechnicianLocationPing.recorded_at.desc())
            )
            skill_bit = " · ".join(_skill_label(code) for code in skills[:2]) if skills else "Field"
            job_bit = f"{count} job" if count == 1 else f"{count} jobs"
            technicians.append(
                DispatchTechnicianOut(
                    id=tech.id,
                    name=tech.display_name,
                    duty_status="ON_DUTY" if tech.on_duty else "OFF_DUTY",
                    skills_label=f"{skill_bit} · {job_bit}",
                    active_jobs_count=count,
                    van_label=tech.van_code,
                    last_ping_label=_relative_ping(ping.recorded_at if ping else None),
                    area_label=area,
                    assigned_visits=lane,
                )
            )

        unassigned: list[DispatchUnassignedJobOut] = []
        visits = list(
            self.db.scalars(
                select(Visit).where(Visit.status.in_({"UNASSIGNED", "SCHEDULED"}))
            ).all()
        )
        for visit in visits:
            current = self.visits.get_current_assignment(visit.id)
            if current is not None:
                continue
            job = self.db.get(JobCard, visit.job_card_id)
            ctx = job.vehicle_context if job else {}
            snapshot = self.db.scalar(
                select(BookingSnapshot).where(BookingSnapshot.booking_id == visit.booking_id)
            )
            address = (snapshot.address_snapshot if snapshot else {}) or {}
            lat = address.get("latitude")
            lng = address.get("longitude")
            unassigned.append(
                DispatchUnassignedJobOut(
                    visit_id=visit.id,
                    job_card_id=visit.job_card_id,
                    job_card_ref=job.public_ref if job else visit.public_ref,
                    vehicle_label=vehicle_label(ctx),
                    visit_window_label=visit_window_label(
                        visit.scheduled_start_at, visit.scheduled_end_at
                    ),
                    scheduled_start_at=visit.scheduled_start_at,
                    scheduled_end_at=visit.scheduled_end_at,
                    latitude=float(lat) if lat is not None else None,
                    longitude=float(lng) if lng is not None else None,
                )
            )
        return DispatchBoardOut(technicians=technicians, unassigned_jobs=unassigned)

    def _advisor_note(self, job_card_id: str) -> str | None:
        from app.modules.advisor.models import AdvisorCase

        case = self.db.scalar(select(AdvisorCase).where(AdvisorCase.job_card_id == job_card_id))
        if case is None:
            return None
        latest = self.db.scalar(
            select(AdvisorNote)
            .where(AdvisorNote.advisor_case_id == case.id)
            .order_by(AdvisorNote.created_at.desc())
        )
        return latest.body if latest else None

    def _enqueue_assigned(self, visit: Visit, technician_id: str, admin_id: str) -> None:
        self.db.add(
            OutboxEvent(
                event_type="visit.assigned",
                payload={
                    "visit_id": visit.id,
                    "technician_id": technician_id,
                    "admin_id": admin_id,
                    "booking_id": visit.booking_id,
                },
            )
        )
        from app.modules.notifications.service import enqueue_intent

        booking = self.db.get(Booking, visit.booking_id)
        if booking is not None:
            enqueue_intent(
                self.db,
                profile_id=booking.profile_id,
                intent="technician_assigned",
                entity_type="booking",
                entity_id=booking.id,
                context={
                    "service_name": "your visit",
                    "booking_id": booking.id,
                    "visit_id": visit.id,
                },
            )
        tech = self.db.get(Technician, technician_id)
        if tech is not None:
            enqueue_intent(
                self.db,
                profile_id=tech.profile_id,
                intent="visit_assigned",
                entity_type="visit",
                entity_id=visit.id,
                context={"service_name": "assigned visit", "visit_id": visit.id},
                role="technician",
            )

    def mass_assign(
        self, job_card_ids: list[str], technician_id: str, admin: CurrentUser
    ) -> dict:
        assigned: list[str] = []
        failed: list[dict] = []
        for job_card_id in job_card_ids:
            try:
                result = self.assign_to_job_card(job_card_id, technician_id, admin)
                assigned.append(result.visit_id)
            except DomainProblem as exc:
                failed.append(
                    {
                        "job_card_id": job_card_id,
                        "code": exc.code,
                        "message": exc.message,
                        "details": exc.details or {},
                    }
                )
        return {"assigned": assigned, "failed": failed}


def _skill_label(code: str) -> str:
    labels = {
        "ONE_MAN": "One-man",
        "GS": "GS",
        "AC": "AC",
        "electrics": "electrics",
        "brakes": "brakes",
    }
    return labels.get(code, code.replace("_", " ").title())


def _relative_ping(recorded_at: datetime | None) -> str | None:
    if recorded_at is None:
        return None
    stamp = recorded_at if recorded_at.tzinfo else recorded_at.replace(tzinfo=UTC)
    minutes = int((datetime.now(UTC) - stamp.astimezone(UTC)).total_seconds() // 60)
    if minutes < 1:
        return "just now"
    if minutes < 60:
        return f"{minutes} min ago"
    hours = minutes // 60
    if hours < 24:
        return f"{hours} hr ago"
    return f"{hours // 24} d ago"
