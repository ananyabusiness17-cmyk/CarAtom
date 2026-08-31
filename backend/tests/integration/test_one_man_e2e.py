from datetime import date, timedelta
from uuid import uuid4

from fastapi.testclient import TestClient

from tests.conftest import make_token
from tests.integration.test_general_service_e2e import FINALIZE, VEHICLE

OM = "bulb-headlight"


def _auth(sub: str | None = None) -> dict[str, str]:
    return {"Authorization": f"Bearer {make_token(sub or str(uuid4()))}"}


def _slot_window() -> tuple[str, str]:
    start = date.today() + timedelta(days=1)
    end = start + timedelta(days=6)
    return start.isoformat(), end.isoformat()


def test_one_man_create_finalize_book_skips_accept(client: TestClient) -> None:
    headers = _auth()
    created = client.post(
        "/v1/job-cards",
        headers=headers,
        json={"service_offering_slug": OM, "vehicle_context": VEHICLE},
    )
    assert created.status_code == 201, created.text
    body = created.json()
    job_id = body["job_card"]["id"]
    flow = body["flow_decision"]
    assert body["job_card"]["flow_policy"] == "ONE_MAN"
    assert "ACCEPT_ESTIMATE" not in flow["allowed_actions"]
    assert flow["required_next_action"] == "FINALIZE"
    assert flow["advisor_requirement"] == "NOT_REQUIRED"

    finalized = client.post(
        f"/v1/job-cards/{job_id}/finalization",
        headers={**headers, "Idempotency-Key": "om-fin-1"},
        json=FINALIZE,
    )
    assert finalized.status_code == 200, finalized.text
    assert finalized.json()["flow_decision"]["required_next_action"] == "SELECT_SLOT"
    assert "ACCEPT_ESTIMATE" not in finalized.json()["flow_decision"]["allowed_actions"]

    slot_from, slot_to = _slot_window()
    slots = client.get(
        f"/v1/job-cards/{job_id}/slots",
        headers=headers,
        params={"from": slot_from, "to": slot_to},
    )
    assert slots.status_code == 200, slots.text
    payload = slots.json()
    assert payload["visit_duration_minutes"] == 30
    available = [row for row in payload["slots"] if row["available"]]
    assert available, payload
    target = next((row for row in available if "14:00" in row["label"]), available[0])
    assert "14:30" in target["label"] or "–" in target["label"]

    held = client.post(
        f"/v1/job-cards/{job_id}/slot-holds",
        headers={**headers, "Idempotency-Key": "om-hold-1"},
        json={"slot_id": target["slot_id"]},
    )
    assert held.status_code == 201, held.text
    hold_id = held.json()["hold"]["id"]

    booked = client.post(
        f"/v1/job-cards/{job_id}/book",
        headers={**headers, "Idempotency-Key": "om-book-1"},
        json={"slot_hold_id": hold_id},
    )
    assert booked.status_code == 201, booked.text
    booking_id = booked.json()["booking"]["id"]
    detail = client.get(f"/v1/bookings/{booking_id}", headers=headers)
    assert detail.status_code == 200, detail.text
    snapshot = detail.json()["snapshot"]
    assert snapshot["flow_policy"] == "ONE_MAN"
    assert snapshot["confirmation_copy_key"] == "one_man_confirmed"
    assert snapshot["offering_slug"] == OM


def test_one_man_rejects_concerns(client: TestClient) -> None:
    response = client.post(
        "/v1/job-cards",
        json={
            "service_offering_slug": OM,
            "vehicle_context": VEHICLE,
            "concerns": [{"text": "extra work"}],
        },
    )
    assert response.status_code == 422
    assert response.json()["code"] == "ONE_MAN_CONCERNS_NOT_ALLOWED"
