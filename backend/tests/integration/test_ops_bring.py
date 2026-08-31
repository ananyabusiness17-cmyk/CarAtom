from datetime import timedelta
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


def _admin_headers() -> dict[str, str]:
    sub = str(uuid4())
    promote_admin(sub)
    return {"Authorization": f"Bearer {make_token(sub, phone='+919900010001')}"}


def _add_confirmed_booking(
    *,
    public_ref: str,
    profile_id: str,
    offering_id: str,
    start,
    end,
) -> str:
    db = TestingSessionLocal()
    try:
        job = JobCard(
            public_ref=public_ref,
            profile_id=profile_id,
            service_offering_id=offering_id,
            flow_policy="GENERAL_SERVICE",
            status="BOOKING_CREATED",
            vehicle_context={"make": "Honda", "model": "City", "year": 2018},
        )
        db.add(job)
        db.flush()
        booking = Booking(
            public_ref=f"BK-{public_ref}",
            job_card_id=job.id,
            profile_id=profile_id,
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
                customer_snapshot={"full_name": "Test"},
                address_snapshot={
                    "line1": "1",
                    "locality": "Koramangala",
                    "latitude": 12.93,
                    "longitude": 77.62,
                },
                vehicle_snapshot=job.vehicle_context,
                estimate_snapshot={},
                offering_snapshot={"slug": GS_SLUG},
                flow_policy="GENERAL_SERVICE",
            )
        )
        job_id = job.id
        db.commit()
        return job_id
    finally:
        db.close()


def test_schedule_overlap_includes_named_details(client: TestClient) -> None:
    db = TestingSessionLocal()
    try:
        tech = seed_phase06(db, also_today=False)
        visit = db.scalar(select(Visit).where(Visit.public_ref == "V-1042-A"))
        offering = db.scalar(select(ServiceOffering).where(ServiceOffering.slug == GS_SLUG))
        assert visit is not None and offering is not None
        existing_job = db.get(JobCard, visit.job_card_id)
        assert existing_job is not None and existing_job.profile_id
        profile_id = existing_job.profile_id
        offering_id = offering.id
        start = visit.scheduled_start_at
        end = visit.scheduled_end_at
        tech_id = tech.id
        db.commit()
    finally:
        db.close()

    job_id = _add_confirmed_booking(
        public_ref="JC-8800",
        profile_id=profile_id,
        offering_id=offering_id,
        start=start,
        end=end,
    )

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
    assert imran["assigned_visits"][0]["scheduled_start_at"]


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
    assert any(line["line_kind"] == "LABOUR" for line in kit.json()["lines"])


def test_visit_kit_and_assign_warnings_never_409_for_short_van(client: TestClient) -> None:
    db = TestingSessionLocal()
    try:
        tech = seed_phase06(db, also_today=False)
        seed_inventory_demo(db)
        seed_catalog_kits(db)
        visit = db.scalar(select(Visit).where(Visit.public_ref == "V-1042-A"))
        assert visit is not None
        visit_id = visit.id
        job_id = visit.job_card_id
        tech_id = tech.id
        db.commit()
    finally:
        db.close()
    headers = _admin_headers()
    kit = client.get(f"/v1/admin/visits/{visit_id}/kit", headers=headers)
    assert kit.status_code == 200, kit.text
    assigned = client.post(
        f"/v1/admin/jobs/{job_id}/assign",
        headers={**headers, "Idempotency-Key": str(uuid4())},
        json={"technician_id": tech_id},
    )
    assert assigned.status_code == 201, assigned.text
    body = assigned.json()
    assert "warnings" in body
    assert body.get("kit") is not None


def test_mass_assign_partial_overlap(client: TestClient) -> None:
    db = TestingSessionLocal()
    try:
        tech = seed_phase06(db, also_today=False)
        visit = db.scalar(select(Visit).where(Visit.public_ref == "V-1042-A"))
        offering = db.scalar(select(ServiceOffering).where(ServiceOffering.slug == GS_SLUG))
        assert visit is not None and offering is not None
        existing_job = db.get(JobCard, visit.job_card_id)
        assert existing_job is not None and existing_job.profile_id
        profile_id = existing_job.profile_id
        offering_id = offering.id
        overlap_start = visit.scheduled_start_at
        overlap_end = visit.scheduled_end_at
        ok_start = visit.scheduled_end_at + timedelta(hours=8)
        ok_end = ok_start + timedelta(hours=1)
        tech_id = tech.id
        db.commit()
    finally:
        db.close()
    overlap_job = _add_confirmed_booking(
        public_ref="JC-8801",
        profile_id=profile_id,
        offering_id=offering_id,
        start=overlap_start,
        end=overlap_end,
    )
    ok_job = _add_confirmed_booking(
        public_ref="JC-8802",
        profile_id=profile_id,
        offering_id=offering_id,
        start=ok_start,
        end=ok_end,
    )
    response = client.post(
        "/v1/admin/dispatch/mass-assign",
        headers=_admin_headers(),
        json={"technician_id": tech_id, "job_card_ids": [overlap_job, ok_job]},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert not any(row["job_card_id"] == ok_job for row in body["failed"])
    assert any(
        row["job_card_id"] == overlap_job and row["code"] == "SCHEDULE_OVERLAP"
        for row in body["failed"]
    )
    assert len(body["assigned"]) == 1


def test_actual_start_and_zero_odometer_rejected(client: TestClient) -> None:
    db = TestingSessionLocal()
    try:
        tech = seed_phase06(db, also_today=False)
        visit = db.scalar(select(Visit).where(Visit.public_ref == "V-1042-A"))
        assert visit is not None
        visit_id = visit.id
        profile_id = tech.profile_id
        db.commit()
    finally:
        db.close()
    headers = {"Authorization": f"Bearer {make_token(profile_id, phone='+919900011001')}"}
    en_route = client.post(
        f"/v1/technician/visits/{visit_id}/en-route",
        headers={**headers, "Idempotency-Key": str(uuid4())},
        json={},
    )
    assert en_route.status_code == 200, en_route.text
    check_in = client.post(
        f"/v1/technician/visits/{visit_id}/check-in",
        headers={**headers, "Idempotency-Key": str(uuid4())},
        json={"lat": 12.93, "lng": 77.62},
    )
    assert check_in.status_code == 200, check_in.text
    assert check_in.json()["actual_start_at"]
    zero = client.post(
        f"/v1/technician/visits/{visit_id}/check-in",
        headers={**headers, "Idempotency-Key": str(uuid4())},
        json={"odometer_km": 0},
    )
    assert zero.status_code == 422
