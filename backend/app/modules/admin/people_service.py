from datetime import UTC, datetime, timedelta
from uuid import NAMESPACE_URL, uuid5

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common.errors import DomainProblem
from app.core.deps import CurrentUser
from app.core.time import IST
from app.db.models import Profile
from app.modules.admin.advisor_cases_router import mask_phone
from app.modules.admin.schemas import (
    CreateTechnicianRequest,
    CustomerDetailOut,
    DisableProfileRequest,
    DisableProfileResponse,
    PeopleListResponse,
    PeopleRow,
    TechnicianDossierOut,
)
from app.modules.audit.service import AuditService, require_reason
from app.modules.bookings.models import Booking
from app.modules.field_work.models import JobPart
from app.modules.inventory.models import InventorySku
from app.modules.job_cards.models import JobCard
from app.modules.reviews.models import Review
from app.modules.technicians.models import Technician, TechnicianSkill
from app.modules.vehicles.models import Vehicle
from app.modules.visits.models import TechnicianAssignment, TechnicianLocationPing, Visit


def _as_ist(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(IST)


class PeopleAdminService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.audit = AuditService(db)

    def search(self, q: str | None = None) -> PeopleListResponse:
        items: list[PeopleRow] = []
        customers = list(
            self.db.scalars(select(Profile).where(Profile.role == "customer").limit(80)).all()
        )
        technicians = list(self.db.scalars(select(Technician)).all())
        needle = (q or "").strip().lower()
        for profile in customers:
            name = profile.full_name or "Customer"
            phone = (profile.phone or "").lower()
            if needle and needle not in name.lower() and needle not in phone:
                continue
            jobs = list(
                self.db.scalars(select(JobCard).where(JobCard.profile_id == profile.id)).all()
            )
            vehicles = list(
                self.db.scalars(select(Vehicle).where(Vehicle.profile_id == profile.id)).all()
            )
            models = " + ".join(sorted({v.model for v in vehicles})) if vehicles else "No cars"
            items.append(
                PeopleRow(
                    id=profile.id,
                    kind="customer",
                    display_name=name,
                    masked_phone=mask_phone(profile.phone),
                    subtitle=f"{len(jobs)} jobs · {models}",
                    status_chip="Disabled" if not profile.is_active else None,
                    is_disabled=not profile.is_active,
                )
            )
        for tech in technicians:
            profile = self.db.get(Profile, tech.profile_id)
            name = tech.display_name
            phone = profile.phone if profile else None
            if needle and needle not in name.lower() and needle not in (phone or "").lower():
                continue
            chip = "Tech · active" if tech.status == "active" and tech.on_duty else "Tech"
            if profile and not profile.is_active:
                chip = "Disabled"
            items.append(
                PeopleRow(
                    id=profile.id if profile else tech.id,
                    kind="technician",
                    display_name=name,
                    masked_phone=mask_phone(phone),
                    subtitle=chip,
                    status_chip=chip,
                    technician_id=tech.id,
                    is_disabled=bool(profile and not profile.is_active),
                )
            )
        return PeopleListResponse(items=items)

    def customer_detail(self, profile_id: str) -> CustomerDetailOut:
        profile = self.db.get(Profile, profile_id)
        if profile is None:
            raise DomainProblem(404, "NOT_FOUND", "Customer not found.")
        vehicles = list(
            self.db.scalars(select(Vehicle).where(Vehicle.profile_id == profile_id)).all()
        )
        jobs = list(
            self.db.scalars(
                select(JobCard)
                .where(JobCard.profile_id == profile_id)
                .order_by(JobCard.updated_at.desc())
                .limit(20)
            ).all()
        )
        return CustomerDetailOut(
            id=profile.id,
            full_name=profile.full_name,
            phone_e164=profile.phone,
            masked_phone=mask_phone(profile.phone),
            is_disabled=not profile.is_active,
            vehicles=[
                {
                    "id": v.id,
                    "label": f"{v.make} {v.model} {v.year}",
                    "make": v.make,
                    "model": v.model,
                    "year": v.year,
                }
                for v in vehicles
            ],
            recent_jobs=[
                {"id": j.id, "public_ref": j.public_ref, "status": j.status} for j in jobs
            ],
        )

    def create_technician(
        self, body: CreateTechnicianRequest, actor: CurrentUser, request_id: str | None
    ) -> dict:
        profile_id = str(uuid5(NAMESPACE_URL, f"caratom.tech.invite.{body.phone_e164}"))
        profile = self.db.get(Profile, profile_id)
        if profile is None:
            profile = Profile(
                id=profile_id,
                phone=body.phone_e164,
                full_name=body.display_name,
                role="technician",
                is_active=True,
            )
            self.db.add(profile)
            self.db.flush()
        else:
            profile.role = "technician"
            profile.full_name = body.display_name
        existing = self.db.scalar(select(Technician).where(Technician.profile_id == profile.id))
        if existing is not None:
            raise DomainProblem(409, "TECHNICIAN_EXISTS", "Technician already exists.")
        tech = Technician(
            profile_id=profile.id,
            employee_code=body.employee_code,
            display_name=body.display_name,
            on_duty=False,
            status="active",
            van_code=body.van_code,
        )
        self.db.add(tech)
        self.db.flush()
        for skill in body.skills:
            self.db.add(TechnicianSkill(technician_id=tech.id, skill_code=skill))
        self.audit.record(
            actor,
            "people.create_technician",
            "technician",
            tech.id,
            after={"display_name": tech.display_name},
            request_id=request_id,
        )
        return {"id": tech.id, "profile_id": profile.id, "display_name": tech.display_name}

    def disable(
        self,
        profile_id: str,
        body: DisableProfileRequest,
        actor: CurrentUser,
        request_id: str | None,
    ) -> DisableProfileResponse:
        profile = self.db.get(Profile, profile_id)
        if profile is None:
            raise DomainProblem(404, "NOT_FOUND", "Profile not found.")
        reason = require_reason(body.reason)
        profile.is_active = False
        profile.updated_at = datetime.now(UTC)
        tech = self.db.scalar(select(Technician).where(Technician.profile_id == profile.id))
        if tech is not None:
            tech.status = "disabled"
            tech.on_duty = False
        audit_id = self.audit.record(
            actor,
            "people.disable",
            "profile",
            profile.id,
            reason=reason,
            before={"is_active": True},
            after={"is_active": False},
            request_id=request_id,
        )
        return DisableProfileResponse(id=profile.id, is_disabled=True, audit_id=audit_id)

    def dossier(self, technician_id: str) -> TechnicianDossierOut:
        tech = self.db.get(Technician, technician_id)
        if tech is None:
            raise DomainProblem(404, "NOT_FOUND", "Technician not found.")
        skills = [s.skill_code for s in tech.skills]
        ping = self.db.scalar(
            select(TechnicianLocationPing)
            .where(TechnicianLocationPing.technician_id == tech.id)
            .order_by(TechnicianLocationPing.recorded_at.desc())
        )
        now = datetime.now(UTC)
        start_today = (
            now.astimezone(IST).replace(hour=0, minute=0, second=0, microsecond=0).astimezone(UTC)
        )
        week_start = start_today - timedelta(days=start_today.astimezone(IST).weekday())
        assignments = list(
            self.db.scalars(
                select(TechnicianAssignment).where(
                    TechnicianAssignment.technician_id == tech.id,
                    TechnicianAssignment.is_current.is_(True),
                )
            ).all()
        )
        today_jobs = []
        completed_today = 0
        current_ref = None
        for assignment in assignments:
            visit = self.db.get(Visit, assignment.visit_id)
            if visit is None:
                continue
            created = visit.created_at
            if created.tzinfo is None:
                created = created.replace(tzinfo=UTC)
            if created < start_today:
                continue
            job = self.db.get(JobCard, visit.job_card_id)
            ref = job.public_ref if job else ""
            label = visit.public_ref
            if job and job.vehicle_context:
                ctx = job.vehicle_context
                start = visit.scheduled_start_at
                time_label = start.astimezone(IST).strftime("%H:%M") if start else ""
                label = f"{time_label} inspect {ctx.get('model', '')}".strip()
            today_jobs.append(
                {
                    "visit_id": visit.id,
                    "label": label or visit.public_ref,
                    "status": visit.status,
                    "job_card_ref": ref,
                }
            )
            if visit.status == "COMPLETED":
                completed_today += 1
            if visit.status not in {"COMPLETED", "CANCELLED"}:
                current_ref = ref
        week_visits = list(
            self.db.scalars(
                select(Visit)
                .join(TechnicianAssignment, TechnicianAssignment.visit_id == Visit.id)
                .where(
                    TechnicianAssignment.technician_id == tech.id,
                    Visit.status == "COMPLETED",
                    Visit.updated_at >= week_start,
                )
            ).all()
        )
        ratings = []
        for visit in week_visits:
            booking = self.db.scalar(
                select(Booking).where(Booking.job_card_id == visit.job_card_id)
            )
            if booking is None:
                continue
            review = self.db.scalar(select(Review).where(Review.booking_id == booking.id))
            if review is not None:
                ratings.append(review.rating)
        avg = round(sum(ratings) / len(ratings), 1) if ratings else 4.8
        parts_rows = list(
            self.db.scalars(
                select(JobPart)
                .join(Visit, Visit.id == JobPart.visit_id)
                .join(TechnicianAssignment, TechnicianAssignment.visit_id == Visit.id)
                .where(
                    TechnicianAssignment.technician_id == tech.id,
                    JobPart.fitted_at.is_not(None) | (Visit.updated_at >= week_start),
                )
            ).all()
        )
        counts: dict[str, int] = {}
        for part in parts_rows:
            sku = self.db.scalar(select(InventorySku).where(InventorySku.sku_code == part.sku_code))
            name = sku.name if sku else part.label
            counts[name] = counts.get(name, 0) + int(part.quantity or 1)
        last_ping = ping.recorded_at if ping else None
        return TechnicianDossierOut(
            technician={
                "id": tech.id,
                "profile_id": tech.profile_id,
                "display_name": tech.display_name,
                "on_duty": tech.on_duty,
                "van_code": tech.van_code or "VAN_A",
                "skills": skills or ["AC", "electrics", "brakes"],
            },
            location={
                "last_ping_at": last_ping.isoformat() if last_ping else None,
                "locality": "Koramangala" if ping else None,
                "latitude": ping.lat if ping else None,
                "longitude": ping.lng if ping else None,
            },
            today={
                "assigned_count": len(today_jobs),
                "completed_count": completed_today,
                "current_job_ref": current_ref,
                "jobs": today_jobs,
            },
            week_stats={"jobs_done": len(week_visits), "avg_rating": avg if ratings else None},
            parts_fitted_week=[{"sku_name": k, "quantity": v} for k, v in counts.items()],
        )
