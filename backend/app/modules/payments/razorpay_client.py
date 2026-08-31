from dataclasses import dataclass
from uuid import uuid4

import httpx

from app.common.errors import DomainProblem
from app.config import settings


@dataclass
class RazorpayOrder:
    id: str
    amount: int
    currency: str
    receipt: str


def public_razorpay_key_id() -> str:
    if settings.razorpay_key_id:
        return settings.razorpay_key_id
    if settings.is_production:
        return ""
    return "rzp_test_dev"


class RazorpayClient:
    def create_order(
        self, *, amount_minor: int, currency: str, receipt: str, notes: dict | None = None
    ) -> RazorpayOrder:
        if not settings.razorpay_key_id or not settings.razorpay_key_secret:
            if settings.is_production:
                raise DomainProblem(
                    503,
                    "PAYMENTS_NOT_CONFIGURED",
                    "Payments are not configured.",
                )
            return RazorpayOrder(
                id=f"order_{uuid4().hex[:14]}",
                amount=amount_minor,
                currency=currency,
                receipt=receipt,
            )
        auth = (settings.razorpay_key_id, settings.razorpay_key_secret)
        payload = {
            "amount": amount_minor,
            "currency": currency,
            "receipt": receipt,
            "notes": notes or {},
        }
        response = httpx.post(
            "https://api.razorpay.com/v1/orders",
            json=payload,
            auth=auth,
            timeout=15.0,
        )
        response.raise_for_status()
        body = response.json()
        return RazorpayOrder(
            id=str(body["id"]),
            amount=int(body.get("amount") or amount_minor),
            currency=str(body.get("currency") or currency),
            receipt=str(body.get("receipt") or receipt),
        )


_client = RazorpayClient()


def get_razorpay_client() -> RazorpayClient:
    return _client


def set_razorpay_client(client: RazorpayClient) -> None:
    global _client
    _client = client
