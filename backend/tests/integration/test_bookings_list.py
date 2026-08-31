from datetime import date, timedelta
from uuid import uuid4

from fastapi.testclient import TestClient

from tests.conftest import make_token
from tests.integration.test_general_service_e2e import FINALIZE, VEHICLE


def _auth(sub: str | None = None) -> dict[str, str]:
    return {"Authorization": f"Bearer {make_token(sub or str(uuid4()))}"}


def _book_one_man(client: TestClient, headers: dict[str, str]) -> str:
    created = client.post(
        "/v1/job-cards",
        headers=headers,
        json={"service_offering_slug": "bulb-headlight", "vehicle_context": VEHICLE},
    )
    job_id = created.json()["job_card"]["id"]
    client.post(
        f"/v1/job-cards/{job_id}/finalization",
        headers={**headers, "Idempotency-Key": f"list-fin-{job_id}"},
        json=FINALIZE,
    )
    start = date.today() + timedelta(days=1)
    end = start + timedelta(days=6)
    slots = client.get(
        f"/v1/job-cards/{job_id}/slots",
        headers=headers,
        params={"from": start.isoformat(), "to": end.isoformat()},
    )
    target = next(row for row in slots.json()["slots"] if row["available"])
    held = client.post(
        f"/v1/job-cards/{job_id}/slot-holds",
        headers={**headers, "Idempotency-Key": f"list-hold-{job_id}"},
        json={"slot_id": target["slot_id"]},
    )
    booked = client.post(
        f"/v1/job-cards/{job_id}/book",
        headers={**headers, "Idempotency-Key": f"list-book-{job_id}"},
        json={"slot_hold_id": held.json()["hold"]["id"]},
    )
    return booked.json()["booking"]["id"]


def test_bookings_list_requires_auth(client: TestClient) -> None:
    response = client.get("/v1/bookings")
    assert response.status_code == 401


def test_bookings_list_own_rows_only(client: TestClient) -> None:
    owner = _auth()
    other = _auth()
    booking_id = _book_one_man(client, owner)
    mine = client.get("/v1/bookings", headers=owner)
    assert mine.status_code == 200, mine.text
    items = mine.json()["items"]
    assert len(items) == 1
    assert items[0]["id"] == booking_id
    assert items[0]["public_ref"].startswith("BK-") or items[0]["public_ref"].startswith("JC-")
    assert items[0]["flow_policy"] == "ONE_MAN"
    assert "One-man" in items[0]["service_summary"]

    theirs = client.get("/v1/bookings", headers=other)
    assert theirs.status_code == 200
    assert theirs.json()["items"] == []
