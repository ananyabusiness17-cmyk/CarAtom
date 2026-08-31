from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db.models import ServiceOffering
from app.modules.bookings.models import Booking, BookingSnapshot
from app.modules.catalog.kit_service import seed_catalog_kits
from app.modules.catalog.seed import GS_SLUG, seed_catalog
from app.modules.inventory.seed import seed_inventory_demo
from app.modules.job_cards.models import JobCard
from app.modules.visits.demo import seed_phase06
from app.modules.visits.models import Visit
from tests.conftest import TestingSessionLocal, make_token, promote_admin

IST = timezone(timedelta(hours=5, minutes=30))


def _admin_headers() -> dict[str, str]:
    sub = str(uuid4())
    promote_admin(sub)
    return {"Authorization": f"Bearer {make_token(sub, phone='+919900010001')}"}


def test_schedule_overlap_includes_named_details(client: TestClient) -> None:
    db = TestingSessionLocal()
    try:
        tech = seed_phase06(db, also_today=False)
        visit = db.scalar(select(Visit).where(Visit.public_ref == "V-1042-A"))
        assert visit is not None
        offering = db.scalar(select(ServiceOffering).where(ServiceOffering.slug == GS_SLUG))
        assert offering is not None
        job = JobCard(
            public_ref="JC-OVERLAP",
            profile_id=visit.job_card.profile_id if hasattr(visit, "job_card") else None,
            service_offering_id=offering.id,
            flow_policy="GENERAL_SERVICE",
            status="BOOKING_CREATED",
            vehicle_context={"make": "Honda", "model": "City", "year": 2018},
        )
        existing_job = db.get(JobCard, visit.job_card_id)
        job.profile_id = existing_job.profile_id if existing_job else None
        db.add(job)
        db.flush()
        booking = Booking(
            public_ref="BK-OVERLAP",
            job_card_id=job.id,
            profile_id=job.profile_id,
            status="CONFIRMED",
            slot_starts_at=visit.scheduled_start_at,
            slot_ends_at=visit.scheduled_end_at,
            timezone="Asia/Kolkata",
            visit_type="SERVICE",
        )
        db.add(booking)
        db.flush()
        db.add(
            BookingSnapshot(
                booking_id=booking.id,
                customer_snapshot={"full_name": "Test"},
                address_snapshot={"line1": "1", "locality": "Koramangala", "latitude": 12.93, "longitude": 77.62},
                vehicle_snapshot=job.vehicle_context,
                estimate_snapshot={},
                offering_snapshot={"slug": GS_SLUG},
                flow_policy="GENERAL_SERVICE",
            )
        )
        job_id = job.id
        tech_id = tech.id
        db.commit()
    finally:
        db.close()

    response = client.post(
        f"/v1/admin/jobs/{job_id}/assign",
        headers={**_admin_headers(), "Idempotency-Key": str(uuid4())},
        json={"technician_id": tech_id},
    )
    assert response.status_code == 409, response.text
    body = response.json()
    assert body["code"] == "SCHEDULE_OVERLAP"
    assert body["details"]["conflicting_public_ref"] == "V-1042-A"
    assert body["details"]["technician_name"] == "Imran"


def test_dispatch_board_includes_lanes(client: TestClient) -> None:
    db = TestingSessionLocal()
    try:
        seed_phase06(db, also_today=False)
        db.commit()
    finally:
        db.close()
    response = client.get("/v1/admin/dispatch", headers=_admin_headers())
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["technicians"]
    imran = next(row for row in payload["technicians"] if row["name"] == "Imran")
    assert imran["assigned_visits"]
    assert imran["assigned_visits"][0]["job_card_ref"]


def test_closeout_and_catalog_kit(client: TestClient) -> None:
    db = TestingSessionLocal()
    try:
        seed_catalog(db)
        seed_inventory_demo(db)
        seed_catalog_kits(db)
        db.commit()
        offering = db.scalar(select(ServiceOffering).where(ServiceOffering.slug == GS_SLUG))
        assert offering is not None
        owner_id = offering.id
    finally:
        db.close()
    headers = _admin_headers()
    closeout = client.get("/v1/admin/closeout?queue=qc_incomplete", headers=headers)
    assert closeout.status_code == 200
    assert closeout.json()["queue"] == "qc_incomplete"
    kit = client.get(
        f"/v1/admin/catalog/kits?owner_type=SERVICE_OFFERING&owner_id={owner_id}",
        headers=headers,
    )
    assert kit.status_code == 200, kit.text
    assert kit.json()["owner_type"] == "SERVICE_OFFERING"
