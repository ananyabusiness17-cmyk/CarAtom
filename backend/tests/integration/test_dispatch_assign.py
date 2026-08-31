from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.modules.visits.demo import seed_phase06
from app.modules.visits.models import Visit
from tests.conftest import TestingSessionLocal, make_token, promote_admin


def test_dispatch_assign_creates_visit(client: TestClient) -> None:
    db = TestingSessionLocal()
    try:
        tech = seed_phase06(db, also_today=False)
        visit = db.scalar(select(Visit).where(Visit.public_ref == "V-1042-A"))
        assert visit is not None
        job_card_id = visit.job_card_id
        technician_id = tech.id
        booking_id = visit.booking_id
    finally:
        db.close()

    admin_sub = str(uuid4())
    promote_admin(admin_sub)
    admin_headers = {"Authorization": f"Bearer {make_token(admin_sub, phone='+919900010001')}"}

    # Existing assignment is idempotent (same technician).
    response = client.post(
        f"/v1/admin/jobs/{job_card_id}/assign",
        headers={**admin_headers, "Idempotency-Key": str(uuid4())},
        json={"technician_id": technician_id, "visit_type": "SERVICE"},
    )
    assert response.status_code == 201, response.text
    assert response.json()["visit_id"]
    assert response.json()["status"] == "ASSIGNED"

    tech_headers = {"Authorization": f"Bearer {make_token(tech.profile_id, phone='+919900011001')}"}
    listed = client.get("/v1/technician/visits?date=2026-08-19", headers=tech_headers)
    assert listed.status_code == 200
    assert any(row["job_card_ref"] == "JC-1042" for row in listed.json()["visits"])
    assert booking_id


def test_customer_cannot_assign(client: TestClient) -> None:
    token = make_token(str(uuid4()))
    response = client.post(
        f"/v1/admin/jobs/{uuid4()}/assign",
        headers={"Authorization": f"Bearer {token}"},
        json={"technician_id": str(uuid4()), "visit_type": "SERVICE"},
    )
    assert response.status_code == 403
