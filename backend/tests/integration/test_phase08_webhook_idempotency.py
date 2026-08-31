from fastapi.testclient import TestClient

from app.config import settings
from tests.integration.phase08_helpers import (
    book_and_issue,
    captured_payload,
    create_order,
    sign_webhook,
)
from tests.integration.test_bookings_list import _auth


def test_webhook_capture_pays_invoice_once(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(settings, "razorpay_webhook_secret", "whsec_test")
    headers = _auth()
    _booking_id, invoice = book_and_issue(client, headers)
    order = create_order(client, headers, invoice["id"])
    body = captured_payload(
        order_id=order["razorpay_order_id"],
        amount_minor=order["amount_minor"],
        event_id="evt_test_captured_1",
        payment_id="pay_KkL2M3N4O5P6Q7",
    )
    signature = sign_webhook(body, "whsec_test")
    first = client.post(
        "/v1/payments/webhook/razorpay",
        content=body,
        headers={"X-Razorpay-Signature": signature},
    )
    assert first.status_code == 200, first.text
    paid = client.get(f"/v1/invoices/{invoice['id']}", headers=headers)
    assert paid.status_code == 200, paid.text
    assert paid.json()["status"] == "PAID"
    assert paid.json()["balance_minor"] == 0
    paid_minor = paid.json()["paid_minor"]

    second = client.post(
        "/v1/payments/webhook/razorpay",
        content=body,
        headers={"X-Razorpay-Signature": signature},
    )
    assert second.status_code == 200
    assert second.json().get("duplicate") is True
    again = client.get(f"/v1/invoices/{invoice['id']}", headers=headers)
    assert again.json()["paid_minor"] == paid_minor
    assert again.json()["status"] == "PAID"

    payment = client.get(f"/v1/payments/{order['payment_id']}", headers=headers)
    assert payment.json()["verification_status"] == "VERIFIED"
    assert payment.json()["status"] == "CAPTURED"


def test_webhook_rejects_invalid_signature(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(settings, "razorpay_webhook_secret", "whsec_test")
    body = b'{"event":"payment.captured","id":"evt_bad"}'
    response = client.post(
        "/v1/payments/webhook/razorpay",
        content=body,
        headers={"X-Razorpay-Signature": "deadbeef"},
    )
    assert response.status_code == 401
    missing = client.post("/v1/payments/webhook/razorpay", content=body)
    assert missing.status_code == 401
