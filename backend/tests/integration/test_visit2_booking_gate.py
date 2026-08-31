from uuid import uuid4

from fastapi.testclient import TestClient

from tests.conftest import make_token, promote_admin
from tests.integration.test_inspection_repair_e2e import (
    _assign_and_submit_findings,
    _auth,
    _create_and_book_inspection,
    _slot_window,
)


def test_visit2_reschedule_preserves_estimate(client: TestClient) -> None:
    headers = _auth()
    job_id, _ = _create_and_book_inspection(client, headers)
    _assign_and_submit_findings(client, job_id, headers)
    findings = client.get(f"/v1/job-cards/{job_id}/inspection-findings", headers=headers).json()
    estimate_id = findings["estimate_summary"]["estimate_id"]
    total = findings["estimate_summary"]["total"]["amount_minor"]
    content_hash = findings["estimate_summary"]["content_hash"]
    client.post(
        f"/v1/job-cards/{job_id}/estimates/{estimate_id}/accept",
        headers={**headers, "Idempotency-Key": "rs-accept"},
        json={"expected_total_minor": total, "expected_content_hash": content_hash},
    )
    order = client.post(
        f"/v1/job-cards/{job_id}/parts-advance/payment-order",
        headers={**headers, "Idempotency-Key": "rs-pay"},
        json={"estimate_id": estimate_id, "expected_amount_minor": 480000},
    )
    client.post(f"/v1/dev/payments/{order.json()['payment_id']}/capture", headers=headers)
    admin_sub = str(uuid4())
    promote_admin(admin_sub)
    admin_headers = {"Authorization": f"Bearer {make_token(admin_sub, phone='+919900010001')}"}
    client.post(f"/v1/admin/job-cards/{job_id}/parts-ready", headers=admin_headers)

    slot_from, slot_to = _slot_window()
    slots = client.get(
        f"/v1/job-cards/{job_id}/slots",
        headers=headers,
        params={"from": slot_from, "to": slot_to, "visit_type": "REPAIR"},
    )
    available = [row for row in slots.json()["slots"] if row["available"]]
    held = client.post(
        f"/v1/job-cards/{job_id}/slot-holds",
        headers={**headers, "Idempotency-Key": "rs-hold-1"},
        json={"slot_id": available[0]["slot_id"]},
    )
    booked = client.post(
        f"/v1/job-cards/{job_id}/book-repair",
        headers={**headers, "Idempotency-Key": "rs-book"},
        json={"slot_hold_id": held.json()["hold"]["id"], "visit_type": "REPAIR"},
    )
    assert booked.status_code == 201, booked.text
    booking_id = booked.json()["booking"]["id"]
    before = client.get(f"/v1/job-cards/{job_id}", headers=headers).json()["job_card"][
        "accepted_inspection_estimate_id"
    ]

    held2 = client.post(
        f"/v1/job-cards/{job_id}/slot-holds",
        headers={**headers, "Idempotency-Key": "rs-hold-2"},
        json={"slot_id": available[1]["slot_id"]},
    )
    assert held2.status_code == 201, held2.text
    rescheduled = client.post(
        f"/v1/bookings/{booking_id}/reschedule",
        headers={**headers, "Idempotency-Key": "rs-move"},
        json={"slot_hold_id": held2.json()["hold"]["id"]},
    )
    assert rescheduled.status_code == 200, rescheduled.text
    after = client.get(f"/v1/job-cards/{job_id}", headers=headers).json()["job_card"]
    assert after["accepted_inspection_estimate_id"] == before == estimate_id
    assert after["status"] == "REPAIR_BOOKED"
