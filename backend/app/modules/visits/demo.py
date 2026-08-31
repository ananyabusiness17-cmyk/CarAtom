"""Idempotent Phase 06 technician + three-visit demo seed."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import NAMESPACE_URL, uuid5

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Profile, ServiceOffering
from app.modules.bookings.models import Booking, BookingSnapshot
from app.modules.catalog.seed import GS_SLUG, seed_catalog
from app.modules.job_cards.models import JobCard, JobCardConcern
from app.modules.slots.seed import seed_scheduling
from app.modules.technicians.models import Technician, TechnicianSkill
from app.modules.visits.models import TechnicianAssignment, Visit

IST = timezone(timedelta(hours=5, minutes=30))
IMRAN_PHONE = "+919900011001"
IMRAN_PROFILE_NS = uuid5(NAMESPACE_URL, "caratom.technician.imran")

JC_1042_SCOPE = [
    {
        "id": str(uuid5(NAMESPACE_URL, "scope.jc1042.gs")),
        "label": "General servicing + health report",
        "kind": "SERVICE",
        "status": "PENDING",
    },
    {
        "id": str(uuid5(NAMESPACE_URL, "scope.jc1042.ac")),
        "label": "AC gas refill",
        "kind": "REPAIR",
        "status": "PENDING",
    },
    {
        "id": str(uuid5(NAMESPACE_URL, "scope.jc1042.pads")),
        "label": "Brake pads (pair)",
        "kind": "REPAIR",
        "status": "PENDING",
    },
    {
        "id": str(uuid5(NAMESPACE_URL, "scope.jc1042.fluid")),
        "label": "Brake fluid flush",
        "kind": "REPAIR",
        "status": "PENDING",
    },
]


def _ensure_profile(db: Session, profile_id: str, *, phone: str, name: str, role: str) -> Profile:
    row = db.get(Profile, profile_id)
    if row is None:
        by_phone = db.scalar(select(Profile).where(Profile.phone == phone))
        if by_phone is not None:
            by_phone.role = role
            by_phone.full_name = name
            return by_phone
        row = Profile(
            id=profile_id,
            phone=phone,
            full_name=name,
            role=role,
            is_active=True,
        )
        db.add(row)
        db.flush()
        return row
    row.role = role
    row.full_name = name
    row.phone = phone
    return row


def ensure_imran(db: Session) -> Technician:
    profile = _ensure_profile(
        db, str(IMRAN_PROFILE_NS), phone=IMRAN_PHONE, name="Imran", role="technician"
    )
    tech = db.scalar(select(Technician).where(Technician.profile_id == profile.id))
    if tech is None:
        tech = Technician(
            profile_id=profile.id,
            employee_code="T-11001",
            display_name="Imran",
            on_duty=True,
            status="active",
            van_code="VAN_A",
        )
        db.add(tech)
        db.flush()
    else:
        tech.on_duty = True
        tech.status = "active"
        tech.display_name = "Imran"
        if not tech.van_code:
            tech.van_code = "VAN_A"
    for skill in ("AC", "electrics", "brakes"):
        exists = db.scalar(
            select(TechnicianSkill).where(
                TechnicianSkill.technician_id == tech.id, TechnicianSkill.skill_code == skill
            )
        )
        if exists is None:
            db.add(TechnicianSkill(technician_id=tech.id, skill_code=skill))
    db.flush()
    return tech


def _offering(db: Session) -> ServiceOffering:
    row = db.scalar(select(ServiceOffering).where(ServiceOffering.slug == GS_SLUG))
    if row is None:
        seed_catalog(db)
        row = db.scalar(select(ServiceOffering).where(ServiceOffering.slug == GS_SLUG))
    assert row is not None
    return row


def _upsert_visit_bundle(
    db: Session,
    *,
    tech: Technician,
    customer_id: str,
    public_ref: str,
    visit_ref: str,
    visit_type: str,
    display_type_label: str,
    vehicle: dict,
    concerns: str,
    start: datetime,
    end: datetime,
    distance_km: float,
    address_locality: str,
    address_line1: str,
    parking_notes: str | None,
    scope_lines: list[dict],
    advisor_note: str | None,
    flow_policy: str,
) -> Visit:
    existing = db.scalar(select(Visit).where(Visit.public_ref == visit_ref))
    if existing is not None:
        existing.scheduled_start_at = start
        existing.scheduled_end_at = end
        existing.distance_km = distance_km
        existing.display_type_label = display_type_label
        existing.scope_lines = scope_lines
        existing.advisor_note = advisor_note
        existing.parking_notes = parking_notes
        assignment = db.scalar(
            select(TechnicianAssignment).where(
                TechnicianAssignment.visit_id == existing.id,
                TechnicianAssignment.is_current.is_(True),
            )
        )
        if assignment is None:
            db.add(
                TechnicianAssignment(visit_id=existing.id, technician_id=tech.id, is_current=True)
            )
        return existing

    offering = _offering(db)
    job = JobCard(
        public_ref=public_ref,
        profile_id=customer_id,
        service_offering_id=offering.id,
        flow_policy=flow_policy,
        status="BOOKING_CREATED",
        vehicle_context=vehicle,
    )
    db.add(job)
    db.flush()
    db.add(JobCardConcern(job_card_id=job.id, text=concerns, sort_order=0))
    booking = Booking(
        public_ref=f"BK-{public_ref}",
        job_card_id=job.id,
        profile_id=customer_id,
        status="CONFIRMED",
        slot_starts_at=start,
        slot_ends_at=end,
        timezone="Asia/Kolkata",
        visit_type=visit_type if visit_type != "SERVICE" else "SERVICE",
    )
    db.add(booking)
    db.flush()
    db.add(
        BookingSnapshot(
            booking_id=booking.id,
            customer_snapshot={
                "id": customer_id,
                "full_name": "Rajesh Kumar",
                "phone": "+919876543210",
            },
            address_snapshot={
                "line1": address_line1,
                "locality": address_locality,
                "city": "Bengaluru",
                "postal_code": "560034",
                "latitude": 12.9352,
                "longitude": 77.6245,
            },
            vehicle_snapshot=vehicle,
            estimate_snapshot={"line_items": scope_lines, "currency": "INR"},
            offering_snapshot={"slug": offering.slug, "name": offering.name},
            flow_policy=flow_policy,
        )
    )
    visit = Visit(
        public_ref=visit_ref,
        booking_id=booking.id,
        job_card_id=job.id,
        visit_type=visit_type,
        status="ASSIGNED",
        scheduled_start_at=start,
        scheduled_end_at=end,
        timezone="Asia/Kolkata",
        scope_lines=scope_lines,
        advisor_note=advisor_note,
        parking_notes=parking_notes,
        distance_km=distance_km,
        display_type_label=display_type_label,
    )
    db.add(visit)
    db.flush()
    db.add(TechnicianAssignment(visit_id=visit.id, technician_id=tech.id, is_current=True))
    return visit


def seed_phase06(db: Session, *, also_today: bool = True) -> Technician:
    seed_catalog(db)
    seed_scheduling(db)
    tech = ensure_imran(db)
    customer = _ensure_profile(
        db,
        str(uuid5(NAMESPACE_URL, "caratom.customer.rajesh")),
        phone="+919876543210",
        name="Rajesh Kumar",
        role="customer",
    )
    demo_day = datetime(2026, 8, 19, tzinfo=IST).date()
    days = [demo_day]
    if also_today:
        today = datetime.now(IST).date()
        if today != demo_day:
            days.append(today)

    fixtures = [
        {
            "public_ref": "JC-1042",
            "visit_ref": "V-1042-A",
            "visit_type": "SERVICE",
            "display_type_label": "Inspection",
            "hour": 11,
            "duration": 2,
            "distance_km": 4.2,
            "vehicle": {
                "make": "Honda",
                "model": "City",
                "year": 2019,
                "fuel_type": "PETROL",
                "registration": "KA-01-XX-4421",
            },
            "concerns": "AC weak on idle · brakes feel soft",
            "locality": "Koramangala 5th Block",
            "line1": "12, 5th Cross, Koramangala 5th Block",
            "parking_notes": "Basement B2 · call on arrival",
            "scope_lines": JC_1042_SCOPE,
            "advisor_note": "Customer accepted on call · pads + fluid confirmed",
            "flow_policy": "GENERAL_SERVICE",
        },
        {
            "public_ref": "JC-0991",
            "visit_ref": "V-0991-A",
            "visit_type": "ONE_MAN",
            "display_type_label": "One-man",
            "hour": 14,
            "duration": 1,
            "distance_km": 7.0,
            "vehicle": {"make": "Hyundai", "model": "Creta", "year": 2021, "fuel_type": "PETROL"},
            "concerns": "lighting",
            "locality": "HSR Layout",
            "line1": "24, 27th Main, HSR Layout",
            "parking_notes": None,
            "scope_lines": [
                {
                    "id": str(uuid5(NAMESPACE_URL, "scope.jc0991.light")),
                    "label": "Lighting repair",
                    "kind": "SERVICE",
                    "status": "PENDING",
                }
            ],
            "advisor_note": None,
            "flow_policy": "ONE_MAN",
        },
        {
            "public_ref": "JC-1008",
            "visit_ref": "V-1008-B",
            "visit_type": "SERVICE",
            "display_type_label": "Repair visit 2",
            "hour": 16,
            "minute": 30,
            "duration": 2,
            "distance_km": 5.0,
            "vehicle": {"make": "Maruti", "model": "Swift", "year": 2018, "fuel_type": "PETROL"},
            "concerns": "Follow-up repair",
            "locality": "Indiranagar",
            "line1": "8, 12th Main, Indiranagar",
            "parking_notes": None,
            "scope_lines": [
                {
                    "id": str(uuid5(NAMESPACE_URL, "scope.jc1008.repair")),
                    "label": "Approved repair scope",
                    "kind": "REPAIR",
                    "status": "PENDING",
                }
            ],
            "advisor_note": None,
            "flow_policy": "GENERAL_SERVICE",
        },
    ]

    for day in days:
        suffix = "" if day == demo_day else f"-{day.isoformat()}"
        for item in fixtures:
            start = datetime(
                day.year,
                day.month,
                day.day,
                item["hour"],
                item.get("minute", 0),
                tzinfo=IST,
            )
            end = start + timedelta(hours=item["duration"])
            _upsert_visit_bundle(
                db,
                tech=tech,
                customer_id=customer.id,
                public_ref=(
                    item["public_ref"] if day == demo_day else f"{item['public_ref']}{suffix}"
                ),
                visit_ref=item["visit_ref"] if day == demo_day else f"{item['visit_ref']}{suffix}",
                visit_type=item["visit_type"],
                display_type_label=item["display_type_label"],
                vehicle=item["vehicle"],
                concerns=item["concerns"],
                start=start,
                end=end,
                distance_km=item["distance_km"],
                address_locality=item["locality"],
                address_line1=item["line1"],
                parking_notes=item["parking_notes"],
                scope_lines=item["scope_lines"],
                advisor_note=item["advisor_note"],
                flow_policy=item["flow_policy"],
            )
    db.commit()
    return tech
