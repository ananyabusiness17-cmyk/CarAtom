from datetime import datetime

from pydantic import BaseModel, Field


class InvoiceLineOut(BaseModel):
    id: str
    sort_order: int
    kind: str
    label: str
    quantity: float
    unit_price_minor: int
    amount_minor: int
    metadata: dict | None = None


class InvoiceOut(BaseModel):
    id: str
    booking_id: str
    invoice_number: str
    status: str
    currency: str
    subtotal_minor: int
    tax_minor: int
    total_minor: int
    paid_minor: int
    balance_minor: int
    issued_at: datetime | None = None
    pdf_download_url: str | None = None
    line_items: list[InvoiceLineOut] = Field(default_factory=list)
    allowed_actions: list[str] = Field(default_factory=list)
    payment_method: str | None = None


class InvoiceSummaryOut(BaseModel):
    id: str
    status: str
    balance_minor: int
    invoice_number: str | None = None
