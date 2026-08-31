from datetime import datetime

from pydantic import BaseModel, Field

from app.core.schemas import FlowDecisionSchema
from app.modules.invoices.schemas import InvoiceSummaryOut


class SlotSummary(BaseModel):
    starts_at: datetime
    ends_at: datetime
    display: str


class BookingOut(BaseModel):
    id: str
    public_ref: str
    status: str
    slot: SlotSummary
    job_card_ref: str
    job_card_id: str | None = None
    vehicle_summary: str
    address_summary: str
    customer_progress: str
    note: str | None = None


class BookRequest(BaseModel):
    slot_hold_id: str
    visit_type: str | None = None


class BookResponse(BaseModel):
    booking: BookingOut
    flow_decision: FlowDecisionSchema | None = None


class ProgressStepOut(BaseModel):
    key: str
    label: str
    status: str


class CustomerProgressOut(BaseModel):
    key: str
    headline: str
    subheadline: str | None = None
    steps: list[ProgressStepOut] = Field(default_factory=list)
    primary_action: str | None = None


class BookingDetailResponse(BaseModel):
    booking: BookingOut
    snapshot: dict | None = None
    customer_progress: CustomerProgressOut | None = None
    allowed_actions: list[str] = Field(default_factory=list)
    visits: list[dict] = Field(default_factory=list)
    invoice: InvoiceSummaryOut | None = None
    review_submitted: bool = False


class BookingSummaryOut(BaseModel):
    id: str
    public_ref: str
    status: str
    progress_label: str
    service_summary: str
    flow_policy: str
    visit_starts_at: datetime
    created_at: datetime
    title: str | None = None
    status_chip: str | None = None
    status_tone: str | None = None
    subtitle: str | None = None
    vehicle_summary: str | None = None
    customer_progress: str | None = None
    next_action_hint: str | None = None


class BookingListResponse(BaseModel):
    items: list[BookingSummaryOut]
    next_cursor: str | None = None
    has_more: bool = False
