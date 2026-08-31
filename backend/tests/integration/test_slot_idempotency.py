from uuid import uuid4

from fastapi.testclient import TestClient

from tests.conftest import make_token
from tests.integration.test_general_service_e2e import FINALIZE, GS, VEHICLE, _slot_window


def _headers(sub: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {make_token(sub)}"}


def _ready_to_book(client: TestClient, headers: dict[str, str]) -> tuple[str, str]:
    created = client.post(
        "/v1/job-cards",
        headers=headers,
        json={
            "service_offering_slug": GS,
            "vehicle_context": VEHICLE,
            "concerns": [{"text": "Demo"}],
        },
    )
    job_id = created.json()["job_card"]["id"]
    priced = client.post(f"/v1/job-cards/{job_id}/price", headers=headers).json()
    client.post(
        f"/v1/job-cards/{job_id}/estimates/{priced['estimate']['id']}/accept",
        headers={**headers, "Idempotency-Key": f"accept-{job_id}"},
        json={
            "expected_total_minor": 299900,
            "expected_content_hash": priced["estimate"]["content_hash"],
        },
    )
    client.post(
        f"/v1/job-cards/{job_id}/finalization",
        headers={**headers, "Idempotency-Key": f"fin-{job_id}"},
        json=FINALIZE,
    )
    slot_from, slot_to = _slot_window()
    slots = client.get(
        f"/v1/job-cards/{job_id}/slots",
        headers=headers,
        params={"from": slot_from, "to": slot_to},
    ).json()["slots"]
    target = next(row for row in slots if row["available"])
    held = client.post(
        f"/v1/job-cards/{job_id}/slot-holds",
        headers={**headers, "Idempotency-Key": f"hold-{job_id}"},
        json={"slot_id": target["slot_id"]},
    )
    return job_id, held.json()["hold"]["id"]


def test_double_book_same_key_one_booking(client: TestClient) -> None:
    sub = str(uuid4())
    headers = _headers(sub)
    job_id, hold_id = _ready_to_book(client, headers)
    first = client.post(
        f"/v1/job-cards/{job_id}/book",
        headers={**headers, "Idempotency-Key": "book-same"},
        json={"slot_hold_id": hold_id},
    )
    second = client.post(
        f"/v1/job-cards/{job_id}/book",
        headers={**headers, "Idempotency-Key": "book-same"},
        json={"slot_hold_id": hold_id},
    )
    assert first.status_code == 201, first.text
    assert second.status_code in {200, 201}, second.text
    assert first.json()["booking"]["id"] == second.json()["booking"]["id"]
