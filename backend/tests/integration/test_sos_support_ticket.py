from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.modules.job_cards.models import JobCard
from tests.conftest import TestingSessionLocal, make_token, promote_admin

SOS_BODY = {
    "ticket_type": "ROADSIDE",
    "issue_code": "FLAT_TYRE",
    "issue_label": "Flat tyre",
    "latitude": 12.9352,
    "longitude": 77.6245,
    "location_label": "Koramangala",
}


def _auth(sub: str | None = None) -> tuple[dict[str, str], str]:
    profile_id = sub or str(uuid4())
    return {"Authorization": f"Bearer {make_token(profile_id)}"}, profile_id


def _job_card_count() -> int:
    db = TestingSessionLocal()
    try:
        return int(db.scalar(select(func.count()).select_from(JobCard)) or 0)
    finally:
        db.close()


def test_sos_create_does_not_create_job_card(client: TestClient) -> None:
    headers, _ = _auth()
    before = _job_card_count()
    created = client.post(
        "/v1/support-tickets",
        headers={**headers, "Idempotency-Key": "sos-1"},
        json=SOS_BODY,
    )
    assert created.status_code == 201, created.text
    ticket = created.json()
    assert ticket["public_ref"].startswith("ST-")
    assert ticket["status"] == "CREATED"
    assert ticket["ticket_type"] == "ROADSIDE"
    assert _job_card_count() == before

    duplicate = client.post(
        "/v1/support-tickets",
        headers={**headers, "Idempotency-Key": "sos-2"},
        json=SOS_BODY,
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["code"] == "SOS_ALREADY_ACTIVE"

    fetched = client.get(f"/v1/support-tickets/{ticket['id']}", headers=headers)
    assert fetched.status_code == 200, fetched.text
    assert fetched.json()["ops_phone_e164"]

    other_headers, _ = _auth()
    hidden = client.get(f"/v1/support-tickets/{ticket['id']}", headers=other_headers)
    assert hidden.status_code == 404

    cancelled = client.post(
        f"/v1/support-tickets/{ticket['id']}/cancel",
        headers=headers,
    )
    assert cancelled.status_code == 200, cancelled.text
    assert cancelled.json()["status"] == "CANCELLED"

    again = client.post(
        "/v1/support-tickets",
        headers={**headers, "Idempotency-Key": "sos-3"},
        json={**SOS_BODY, "issue_code": "DEAD_BATTERY", "issue_label": "Dead battery"},
    )
    assert again.status_code == 201, again.text


def test_customer_cannot_admin_patch_ticket(client: TestClient) -> None:
    headers, _ = _auth()
    created = client.post(
        "/v1/support-tickets",
        headers={**headers, "Idempotency-Key": "sos-admin-1"},
        json=SOS_BODY,
    )
    ticket_id = created.json()["id"]
    forbidden = client.patch(
        f"/v1/admin/support-tickets/{ticket_id}",
        headers=headers,
        json={"status": "DISPATCHED_STUB"},
    )
    assert forbidden.status_code == 403
    assert forbidden.json()["code"] == "FORBIDDEN"


def test_admin_can_patch_ticket(client: TestClient) -> None:
    admin_id = str(uuid4())
    promote_admin(admin_id)
    customer_headers, _ = _auth()
    created = client.post(
        "/v1/support-tickets",
        headers={**customer_headers, "Idempotency-Key": "sos-admin-2"},
        json=SOS_BODY,
    )
    ticket_id = created.json()["id"]
    admin_headers = {"Authorization": f"Bearer {make_token(admin_id)}"}
    patched = client.patch(
        f"/v1/admin/support-tickets/{ticket_id}",
        headers=admin_headers,
        json={
            "status": "DISPATCHED_STUB",
            "dispatched_partner_label": "Roadside partner · tyre assist",
            "eta_minutes": 25,
        },
    )
    assert patched.status_code == 200, patched.text
    assert patched.json()["status"] == "DISPATCHED_STUB"

    cancel = client.post(f"/v1/support-tickets/{ticket_id}/cancel", headers=customer_headers)
    assert cancel.status_code == 409
    assert cancel.json()["code"] == "TICKET_NOT_CANCELLABLE"
