"""Shared Phase 08 booking + invoice helpers for integration tests."""

from __future__ import annotations

import hashlib
import hmac
import json
from uuid import uuid4

from fastapi.testclient import TestClient

from tests.integration.test_bookings_list import _book_one_man


def issue_invoice(client: TestClient, headers: dict[str, str], booking_id: str) -> dict:
    response = client.post(
        "/v1/dev/simulate/issue-invoice",
        headers=headers,
        json={"booking_id": booking_id, "force": True},
    )
    assert response.status_code == 200, response.text
    return response.json()


def create_order(client: TestClient, headers: dict[str, str], invoice_id: str) -> dict:
    response = client.post(
        f"/v1/invoices/{invoice_id}/payment-order",
        headers={**headers, "Idempotency-Key": f"pay-{uuid4()}"},
        json={"purpose": "BALANCE"},
    )
    assert response.status_code == 201, response.text
    return response.json()


def book_and_issue(client: TestClient, headers: dict[str, str]) -> tuple[str, dict]:
    booking_id = _book_one_man(client, headers)
    invoice = issue_invoice(client, headers, booking_id)
    return booking_id, invoice


def sign_webhook(body: bytes, secret: str) -> str:
    return hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()


def captured_payload(*, order_id: str, amount_minor: int, event_id: str, payment_id: str) -> bytes:
    payload = {
        "id": event_id,
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": payment_id,
                    "entity": "payment",
                    "amount": amount_minor,
                    "currency": "INR",
                    "status": "captured",
                    "order_id": order_id,
                    "method": "card",
                    "captured": True,
                }
            }
        },
    }
    return json.dumps(payload, separators=(",", ":")).encode()


def failed_payload(*, order_id: str, event_id: str, payment_id: str) -> bytes:
    payload = {
        "id": event_id,
        "event": "payment.failed",
        "payload": {
            "payment": {
                "entity": {
                    "id": payment_id,
                    "entity": "payment",
                    "status": "failed",
                    "order_id": order_id,
                }
            }
        },
    }
    return json.dumps(payload, separators=(",", ":")).encode()
