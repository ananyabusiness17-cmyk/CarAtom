from datetime import date, timedelta
from uuid import uuid4

from fastapi.testclient import TestClient

from tests.conftest import make_token

GS = "general-service-health-report"
VEHICLE = {
    "make": "Honda",
    "model": "City",
    "year": 2019,
    "fuel_type": "PETROL",
    "transmission": "MANUAL",
}
FINALIZE = {
    "customer": {"full_name": "Rajesh Kumar", "phone_e164": "+919876543210"},
    "address": {
        "line1": "12, 5th Cross, Koramangala 5th Block",
        "locality": "Koramangala 5th Block",
        "city": "Bengaluru",
        "postal_code": "560034",
        "latitude": 12.9352,
        "longitude": 77.6245,
    },
    "vehicle": VEHICLE,
    "save_vehicle": True,
    "save_address": True,
}


def _auth(sub: str | None = None) -> dict[str, str]:
    return {"Authorization": f"Bearer {make_token(sub or str(uuid4()))}"}


def _slot_window() -> tuple[str, str]:
    start = date.today() + timedelta(days=1)
    end = start + timedelta(days=6)
    return start.isoformat(), end.isoformat()


def _assert_no_advisor(flow: dict) -> None:
    assert flow["advisor_requirement"] == "NOT_REQUIRED"
    assert "CREATE_ADVISOR_CASE" not in flow["allowed_actions"]


def test_general_service_e2e(client: TestClient) -> None:
    headers = _auth()
    created = client.post(
        "/v1/job-cards",
        headers=headers,
        json={
            "service_offering_slug": GS,
            "vehicle_context": VEHICLE,
            "concerns": [{"text": "Want full service and a health report. AC feels weak on idle."}],
        },
    )
    assert created.status_code == 201, created.text
    body = created.json()
    job_id = body["job_card"]["id"]
    _assert_no_advisor(body["flow_decision"])
    assert body["flow_decision"]["required_next_action"] == "REQUEST_ESTIMATE"
    assert body["job_card"]["public_ref"].startswith("JC-")

    priced = client.post(f"/v1/job-cards/{job_id}/price", headers=headers)
    assert priced.status_code == 200, priced.text
    price = priced.json()
    assert price["estimate"]["total"]["amount_minor"] == 299900
    _assert_no_advisor(price["flow_decision"])
    assert price["flow_decision"]["required_next_action"] == "ACCEPT_ESTIMATE"
    estimate_id = price["estimate"]["id"]
    content_hash = price["estimate"]["content_hash"]

    accepted = client.post(
        f"/v1/job-cards/{job_id}/estimates/{estimate_id}/accept",
        headers={**headers, "Idempotency-Key": "test-accept-1"},
        json={"expected_total_minor": 299900, "expected_content_hash": content_hash},
    )
    assert accepted.status_code == 200, accepted.text
    _assert_no_advisor(accepted.json()["flow_decision"])
    assert accepted.json()["flow_decision"]["required_next_action"] == "FINALIZE"

    guest_finalize = client.post(f"/v1/job-cards/{job_id}/finalization", json=FINALIZE)
    assert guest_finalize.status_code == 401
    assert guest_finalize.json()["code"] == "AUTH_REQUIRED"

    finalized = client.post(
        f"/v1/job-cards/{job_id}/finalization",
        headers={**headers, "Idempotency-Key": "test-fin-1"},
        json=FINALIZE,
    )
    assert finalized.status_code == 200, finalized.text
    assert finalized.json()["flow_decision"]["required_next_action"] == "SELECT_SLOT"

    slot_from, slot_to = _slot_window()
    slots = client.get(
        f"/v1/job-cards/{job_id}/slots",
        headers=headers,
        params={"from": slot_from, "to": slot_to},
    )
    assert slots.status_code == 200, slots.text
    available = [row for row in slots.json()["slots"] if row["available"]]
    assert available, slots.json()
    target = next((row for row in available if "11:00" in row["label"]), available[0])

    held = client.post(
        f"/v1/job-cards/{job_id}/slot-holds",
        headers={**headers, "Idempotency-Key": "test-hold-1"},
        json={"slot_id": target["slot_id"]},
    )
    assert held.status_code == 201, held.text
    hold_id = held.json()["hold"]["id"]
    assert held.json()["flow_decision"]["required_next_action"] == "CONFIRM_BOOKING"

    booked = client.post(
        f"/v1/job-cards/{job_id}/book",
        headers={**headers, "Idempotency-Key": "test-book-1"},
        json={"slot_hold_id": hold_id},
    )
    assert booked.status_code == 201, booked.text
    booking = booked.json()["booking"]
    assert booking["customer_progress"] == "BOOKING_CONFIRMED"
    assert booking["job_card_ref"].startswith("JC-")

    detail = client.get(f"/v1/bookings/{booking['id']}", headers=headers)
    assert detail.status_code == 200, detail.text
    snapshot = detail.json()["snapshot"]
    assert snapshot["estimate"]["total_minor"] == 299900

    other = client.get(f"/v1/bookings/{booking['id']}", headers=_auth())
    assert other.status_code == 404


def test_create_job_card_gs(client: TestClient) -> None:
    response = client.post(
        "/v1/job-cards",
        json={
            "service_offering_slug": GS,
            "vehicle_context": VEHICLE,
            "concerns": [{"text": "Demo"}],
        },
    )
    assert response.status_code == 201
    assert response.json()["job_card"]["flow_policy"] == "GENERAL_SERVICE"
    assert response.json()["flow_decision"]["advisor_requirement"] == "NOT_REQUIRED"
