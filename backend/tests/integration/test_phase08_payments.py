from fastapi.testclient import TestClient

from app.config import settings
from tests.integration.phase08_helpers import (
    book_and_issue,
    captured_payload,
    create_order,
    failed_payload,
    sign_webhook,
)
from tests.integration.test_bookings_list import _auth


def test_fail_then_new_order_then_capture(client: TestClient, monkeypatch) -> None:
    monkeypatch.setattr(settings, "razorpay_webhook_secret", "whsec_test")
    headers = _auth()
    _booking_id, invoice = book_and_issue(client, headers)
    first_order = create_order(client, headers, invoice["id"])
    fail_body = failed_payload(
        order_id=first_order["razorpay_order_id"],
        event_id="evt_fail_1",
        payment_id="pay_fail_1",
    )
    fail = client.post(
        "/v1/payments/webhook/razorpay",
        content=fail_body,
        headers={"X-Razorpay-Signature": sign_webhook(fail_body, "whsec_test")},
    )
    assert fail.status_code == 200, fail.text
    failed_payment = client.get(f"/v1/payments/{first_order['payment_id']}", headers=headers)
    assert failed_payment.json()["status"] == "FAILED"
    assert failed_payment.json()["verification_status"] == "FAILED"

    second_order = create_order(client, headers, invoice["id"])
    assert second_order["payment_id"] != first_order["payment_id"]
    body = captured_payload(
        order_id=second_order["razorpay_order_id"],
        amount_minor=second_order["amount_minor"],
        event_id="evt_ok_2",
        payment_id="pay_ok_2",
    )
    captured = client.post(
        "/v1/payments/webhook/razorpay",
        content=body,
        headers={"X-Razorpay-Signature": sign_webhook(body, "whsec_test")},
    )
    assert captured.status_code == 200, captured.text
    paid = client.get(f"/v1/invoices/{invoice['id']}", headers=headers)
    assert paid.json()["status"] == "PAID"


def test_invoice_ownership_and_no_client_paid_patch(client: TestClient) -> None:
    owner = _auth()
    other = _auth()
    _booking_id, invoice = book_and_issue(client, owner)
    blocked = client.get(f"/v1/invoices/{invoice['id']}", headers=other)
    assert blocked.status_code == 404
    patched = client.patch(
        f"/v1/invoices/{invoice['id']}",
        headers=owner,
        json={"status": "PAID"},
    )
    assert patched.status_code == 405
    still = client.get(f"/v1/invoices/{invoice['id']}", headers=owner)
    assert still.json()["status"] != "PAID"


def test_cross_profile_payment_404(client: TestClient) -> None:
    owner = _auth()
    other = _auth()
    _booking_id, invoice = book_and_issue(client, owner)
    order = create_order(client, owner, invoice["id"])
    hidden = client.get(f"/v1/payments/{order['payment_id']}", headers=other)
    assert hidden.status_code == 404
