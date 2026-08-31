from fastapi.testclient import TestClient

from tests.integration.test_inspection_repair_e2e import (
    _assign_and_submit_findings,
    _auth,
    _create_and_book_inspection,
    _slot_window,
)


def test_parts_advance_amount_must_match(client: TestClient) -> None:
    headers = _auth()
    job_id, _ = _create_and_book_inspection(client, headers)
    _assign_and_submit_findings(client, job_id, headers)
    findings = client.get(f"/v1/job-cards/{job_id}/inspection-findings", headers=headers).json()
    estimate_id = findings["estimate_summary"]["estimate_id"]
    total = findings["estimate_summary"]["total"]["amount_minor"]
    content_hash = findings["estimate_summary"]["content_hash"]
    accepted = client.post(
        f"/v1/job-cards/{job_id}/estimates/{estimate_id}/accept",
        headers={**headers, "Idempotency-Key": "gate-accept"},
        json={"expected_total_minor": total, "expected_content_hash": content_hash},
    )
    assert accepted.status_code == 200, accepted.text
    bad = client.post(
        f"/v1/job-cards/{job_id}/parts-advance/payment-order",
        headers={**headers, "Idempotency-Key": "gate-pay-bad"},
        json={"estimate_id": estimate_id, "expected_amount_minor": 1},
    )
    assert bad.status_code == 400
    assert bad.json()["code"] == "INVALID_AMOUNT"


def test_visit2_blocked_until_advance_and_parts(client: TestClient) -> None:
    headers = _auth()
    job_id, _ = _create_and_book_inspection(client, headers)
    _assign_and_submit_findings(client, job_id, headers)
    findings = client.get(f"/v1/job-cards/{job_id}/inspection-findings", headers=headers).json()
    estimate_id = findings["estimate_summary"]["estimate_id"]
    total = findings["estimate_summary"]["total"]["amount_minor"]
    content_hash = findings["estimate_summary"]["content_hash"]
    client.post(
        f"/v1/job-cards/{job_id}/estimates/{estimate_id}/accept",
        headers={**headers, "Idempotency-Key": "v2-accept"},
        json={"expected_total_minor": total, "expected_content_hash": content_hash},
    )

    slot_from, slot_to = _slot_window()
    slots = client.get(
        f"/v1/job-cards/{job_id}/slots",
        headers=headers,
        params={"from": slot_from, "to": slot_to, "visit_type": "REPAIR"},
    )
    available = [row for row in slots.json()["slots"] if row["available"]]
    held = client.post(
        f"/v1/job-cards/{job_id}/slot-holds",
        headers={**headers, "Idempotency-Key": "v2-hold-1"},
        json={"slot_id": available[0]["slot_id"]},
    )
    assert held.status_code == 201, held.text
    blocked = client.post(
        f"/v1/job-cards/{job_id}/book-repair",
        headers={**headers, "Idempotency-Key": "v2-book-1"},
        json={"slot_hold_id": held.json()["hold"]["id"], "visit_type": "REPAIR"},
    )
    assert blocked.status_code == 409
    assert blocked.json()["code"] == "PARTS_ADVANCE_REQUIRED"

    order = client.post(
        f"/v1/job-cards/{job_id}/parts-advance/payment-order",
        headers={**headers, "Idempotency-Key": "v2-pay"},
        json={"estimate_id": estimate_id, "expected_amount_minor": 480000},
    )
    client.post(f"/v1/dev/payments/{order.json()['payment_id']}/capture", headers=headers)

    held2 = client.post(
        f"/v1/job-cards/{job_id}/slot-holds",
        headers={**headers, "Idempotency-Key": "v2-hold-2"},
        json={
            "slot_id": available[1]["slot_id"] if len(available) > 1 else available[0]["slot_id"]
        },
    )
    not_ready = client.post(
        f"/v1/job-cards/{job_id}/book-repair",
        headers={**headers, "Idempotency-Key": "v2-book-2"},
        json={"slot_hold_id": held2.json()["hold"]["id"], "visit_type": "REPAIR"},
    )
    assert not_ready.status_code == 409
    assert not_ready.json()["code"] == "PARTS_NOT_READY"
