"""Idempotent Phase 10 admin-mobile demo: JC-1015 unassigned, Kavya, Dev off duty."""

from __future__ import annotations

from datetime import datetime, timedelta
from uuid import NAMESPACE_URL, uuid5

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.bookings.models import Booking, BookingSnapshot
from app.modules.job_cards.models import JobCard, JobCardConcern
from app.modules.technicians.models import Technician, TechnicianSkill
from app.modules.visits.demo import (
    IST,
    _ensure_profile,
    _offering,
    ensure_imran,
    seed_phase06,
)
from app.modules.visits.models import TechnicianAssignment, Visit

KAVYA_PHONE = "+919900011002"
DEV_PHONE = "+919900011003"
KAVYA_PROFILE_NS = uuid5(NAMESPACE_URL, "caratom.technician.kavya")
DEV_PROFILE_NS = uuid5(NAMESPACE_URL, "caratom.technician.dev")


def _ensure_tech(
    db: Session,
    *,
    profile_id: str,
    phone: str,
    name: str,
    employee_code: str,
    skills: tuple[str, ...],
    on_duty: bool,
    van_code: str | None,
) -> Technician:
    profile = _ensure_profile(db, profile_id, phone=phone, name=name, role="technician")
    tech = db.scalar(select(Technician).where(Technician.profile_id == profile.id))
    if tech is None:
        tech = Technician(
            profile_id=profile.id,
            employee_code=employee_code,
            display_name=name,
            on_duty=on_duty,
            status="active",
            van_code=van_code,
        )
        db.add(tech)
        db.flush()
    else:
        tech.on_duty = on_duty
        tech.status = "active"
        tech.display_name = name
        tech.van_code = van_code
        tech.employee_code = employee_code
    for skill in skills:
        exists = db.scalar(
            select(TechnicianSkill).where(
                TechnicianSkill.technician_id == tech.id, TechnicianSkill.skill_code == skill
            )
        )
        if exists is None:
            db.add(TechnicianSkill(technician_id=tech.id, skill_code=skill))
    db.flush()
    return tech


def ensure_kavya(db: Session) -> Technician:
    return _ensure_tech(
        db,
        profile_id=str(KAVYA_PROFILE_NS),
        phone=KAVYA_PHONE,
        name="Kavya",
        employee_code="T-11002",
        skills=("ONE_MAN",),
        on_duty=True,
        van_code="Van B",
    )


def ensure_dev(db: Session) -> Technician:
    return _ensure_tech(
        db,
        profile_id=str(DEV_PROFILE_NS),
        phone=DEV_PHONE,
        name="Dev",
        employee_code="T-11003",
        skills=("GS",),
        on_duty=False,
        van_code=None,
    )


def _job_by_ref(db: Session, public_ref: str) -> JobCard | None:
    return db.scalar(select(JobCard).where(JobCard.public_ref == public_ref))


def _set_locality(job: JobCard, locality: str) -> None:
    ctx = dict(job.vehicle_context or {})
    ctx["locality"] = locality
    job.vehicle_context = ctx


def _reassign(db: Session, visit: Visit, technician_id: str) -> None:
    current = db.scalar(
        select(TechnicianAssignment).where(
            TechnicianAssignment.visit_id == visit.id,
            TechnicianAssignment.is_current.is_(True),
        )
    )
    if current is not None and current.technician_id == technician_id:
        return
    if current is not None:
        current.is_current = False
        current.unassigned_at = datetime.now(IST)
    db.add(TechnicianAssignment(visit_id=visit.id, technician_id=technician_id, is_current=True))


def _clear_assignment(db: Session, visit: Visit) -> None:
    current = db.scalar(
        select(TechnicianAssignment).where(
            TechnicianAssignment.visit_id == visit.id,
            TechnicianAssignment.is_current.is_(True),
        )
    )
    if current is not None:
        current.is_current = False
        current.unassigned_at = datetime.now(IST)


def _ensure_jc1015(db: Session, customer_id: str) -> JobCard:
    start = datetime(2026, 8, 20, 9, 0, tzinfo=IST)
    end = start + timedelta(hours=2)
    existing = _job_by_ref(db, "JC-1015")
    offering = _offering(db)
    vehicle = {
        "make": "Honda",
        "model": "i20",
        "year": 2020,
        "fuel_type": "PETROL",
        "locality": "Koramangala",
    }
    if existing is not None:
        existing.status = "BOOKING_CREATED"
        existing.vehicle_context = vehicle
        visit = db.scalar(select(Visit).where(Visit.job_card_id == existing.id))
        if visit is not None:
            visit.status = "UNASSIGNED"
            visit.scheduled_start_at = start
            visit.scheduled_end_at = end
            _clear_assignment(db, visit)
        return existing

    job = JobCard(
        public_ref="JC-1015",
        profile_id=customer_id,
        service_offering_id=offering.id,
        flow_policy="GENERAL_SERVICE",
        status="BOOKING_CREATED",
        vehicle_context=vehicle,
    )
    db.add(job)
    db.flush()
    db.add(
        JobCardConcern(
            job_card_id=job.id, text="Needs dispatch · unassigned Honda i20", sort_order=0
        )
    )
    booking = Booking(
        public_ref="BK-JC-1015",
        job_card_id=job.id,
        profile_id=customer_id,
        status="CONFIRMED",
        slot_starts_at=start,
        slot_ends_at=end,
        timezone="Asia/Kolkata",
        visit_type="SERVICE",
    )
    db.add(booking)
    db.flush()
    db.add(
        BookingSnapshot(
            booking_id=booking.id,
            customer_snapshot={"id": customer_id, "full_name": "Rajesh Kumar"},
            address_snapshot={"locality": "Koramangala", "city": "Bengaluru"},
            vehicle_snapshot=vehicle,
            estimate_snapshot={"currency": "INR"},
            offering_snapshot={"slug": offering.slug, "name": offering.name},
            flow_policy="GENERAL_SERVICE",
        )
    )
    visit = Visit(
        public_ref="V-1015-A",
        booking_id=booking.id,
        job_card_id=job.id,
        visit_type="SERVICE",
        status="UNASSIGNED",
        scheduled_start_at=start,
        scheduled_end_at=end,
        timezone="Asia/Kolkata",
        display_type_label="Unassigned",
    )
    db.add(visit)
    db.flush()
    return job


def seed_phase10(db: Session) -> dict[str, Technician]:
    seed_phase06(db, also_today=False)
    imran = ensure_imran(db)
    imran.on_duty = True
    imran.van_code = "Van A"
    kavya = ensure_kavya(db)
    dev = ensure_dev(db)

    jc1042 = _job_by_ref(db, "JC-1042")
    if jc1042 is not None:
        jc1042.status = "IN_SERVICE"
        _set_locality(jc1042, "Koramangala")
        visit = db.scalar(select(Visit).where(Visit.public_ref == "V-1042-A"))
        if visit is not None:
            visit.status = "INSPECTION_IN_PROGRESS"
            _reassign(db, visit, imran.id)

    jc0991 = _job_by_ref(db, "JC-0991")
    if jc0991 is not None:
        jc0991.status = "PARTS_ADVANCE_DUE"
        _set_locality(jc0991, "HSR")
        visit = db.scalar(select(Visit).where(Visit.public_ref == "V-0991-A"))
        if visit is not None:
            _reassign(db, visit, kavya.id)

    customer_id = (
        jc1042.profile_id
        if jc1042 and jc1042.profile_id
        else str(uuid5(NAMESPACE_URL, "caratom.customer.rajesh"))
    )
    _ensure_jc1015(db, customer_id)
    db.commit()
    return {"imran": imran, "kavya": kavya, "dev": dev}
