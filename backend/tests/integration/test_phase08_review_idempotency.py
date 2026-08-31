from uuid import uuid4

from fastapi.testclient import TestClient

from app.config import settings
from tests.integration.phase08_helpers import (
    book_and_issue,
    captured_payload,
    create_order,
    sign_webhook,
)
from tests.integration.test_bookings_list import _auth, _book_one_man


def test_review_before_complete_rejected(client: TestClient) -> None:
    headers = _auth()
    booking_id = _book_one_man(client, headers)
    response = client.post(
        "/v1/reviews",
        headers={**headers, "Idempotency-Key": f"rev-{uuid4()}"},
        json={"booking_id": booking_id, "rating": 5, "comment": "too soon"},
    )
    assert response.status_code == 409
    assert response.json()["code"] == "BOOKING_NOT_REVIEWABLE"


def test_review_duplicate_same_key_is_200(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(settings, "razorpay_webhook_secret", "whsec_test")
    headers = _auth()
    _booking_id, invoice = book_and_issue(client, headers)
    order = create_order(client, headers, invoice["id"])
    body = captured_payload(
        order_id=order["razorpay_order_id"],
        amount_minor=order["amount_minor"],
        event_id=f"evt_rev_{uuid4().hex[:8]}",
        payment_id=f"pay_rev_{uuid4().hex[:8]}",
    )
    client.post(
        "/v1/payments/webhook/razorpay",
        content=body,
        headers={"X-Razorpay-Signature": sign_webhook(body, "whsec_test")},
    )
    key = f"rev-{uuid4()}"
    payload = {"booking_id": _booking_id, "rating": 5, "comment": "Great"}
    first = client.post("/v1/reviews", headers={**headers, "Idempotency-Key": key}, json=payload)
    assert first.status_code in {200, 201}, first.text
    second = client.post("/v1/reviews", headers={**headers, "Idempotency-Key": key}, json=payload)
    assert second.status_code == 200, second.text
    assert second.json()["id"] == first.json()["id"]
    other_key = client.post(
        "/v1/reviews",
        headers={**headers, "Idempotency-Key": f"rev-{uuid4()}"},
        json=payload,
    )
    assert other_key.status_code == 409
    assert other_key.json()["code"] == "REVIEW_ALREADY_SUBMITTED"
