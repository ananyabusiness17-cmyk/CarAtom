from datetime import datetime

from pydantic import BaseModel, Field


class PaymentOrderRequest(BaseModel):
    purpose: str = "BALANCE"


class PaymentPrefill(BaseModel):
    name: str | None = None
    contact: str | None = None


class PaymentOrderResponse(BaseModel):
    payment_id: str
    razorpay_order_id: str | None = None
    razorpay_key_id: str
    amount_minor: int
    currency: str
    purpose: str
    status: str
    verification_status: str
    expires_at: datetime | None = None
    prefill: PaymentPrefill = Field(default_factory=PaymentPrefill)


class PaymentOut(BaseModel):
    id: str
    invoice_id: str | None = None
    status: str
    amount_minor: int
    currency: str = "INR"
    purpose: str
    verification_status: str
    captured_at: datetime | None = None
    invoice_status: str | None = None
    message: str | None = None
    failure_reason: str | None = None
    # Phase 07 compatibility
    payment_id: str | None = None
    amount: dict | None = None
