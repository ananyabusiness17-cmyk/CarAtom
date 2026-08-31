from datetime import datetime

from pydantic import BaseModel, Field

from app.core.schemas import FlowDecisionSchema
from app.modules.job_cards.schemas import EstimateOut, JobCardOut, MoneyOut

SAFE_STATUS_LABELS = {
    "OPEN": "Callback requested",
    "CONTACTING": "Callback in progress",
    "CUSTOMER_REACHED": "On call",
    "CHANGES_PROPOSED": "Updating estimate",
    "CUSTOMER_CONFIRMATION_DUE": "Estimate on app",
    "CONFIRMED": "Confirmed",
    "DECLINED": "Estimate declined",
    "UNREACHABLE": "Could not reach you",
    "CANCELLED": "Cancelled",
    "NOT_REQUIRED": "Not required",
}

ADVISOR_DISPLAY_NAME = "Priya"
EXPECTED_WINDOW_MINUTES = 15


class AdvisorCaseCustomerOut(BaseModel):
    id: str
    status: str
    safe_status_label: str
    advisor_display_name: str = ADVISOR_DISPLAY_NAME
    expected_response_window_minutes: int = EXPECTED_WINDOW_MINUTES
    submitted_total_minor: int
    pending_estimate_id: str | None = None
    pending_estimate: EstimateOut | None = None


class AdvisorCaseEnvelope(BaseModel):
    advisor_case: AdvisorCaseCustomerOut
    flow_decision: FlowDecisionSchema


class InboxRowOut(BaseModel):
    job_card_id: str
    public_ref: str
    status: str
    customer_name: str | None = None
    masked_phone: str | None = None
    submitted_total_minor: int | None = None
    callback_requested_at: datetime | None = None
    vehicle_summary: str | None = None


class InboxResponse(BaseModel):
    items: list[InboxRowOut]


class AdminJobCardOut(BaseModel):
    job_card: JobCardOut
    customer_name: str | None = None
    phone_e164: str | None = None
    advisor_case_id: str | None = None
    advisor_case_status: str | None = None
    submitted_estimate: EstimateOut | None = None
    flow_decision: FlowDecisionSchema
    labour_total_minor: int | None = None
    parts_total_minor: int | None = None
    billed_percent: float | None = None


class PublishLineIn(BaseModel):
    kind: str
    label: str | None = None
    repair_offering_slug: str | None = None
    amount_minor: int


class AdminPublishEstimateRequest(BaseModel):
    lines: list[PublishLineIn] = Field(..., min_length=1)
    advisor_case_id: str | None = None
    publish_to_customer: bool = True
    revision_notes_customer_safe: str | None = None
    force_approve: bool = False
    reason: str | None = None


class AdminPublishEstimateResponse(BaseModel):
    estimate: EstimateOut
    advisor_case_id: str
    advisor_case_status: str
    customer_notified_at: datetime
    flow_decision: FlowDecisionSchema
    total: MoneyOut


class RejectEstimateRequest(BaseModel):
    reason: str | None = None


class RejectEstimateResponse(BaseModel):
    job_card: JobCardOut
    flow_decision: FlowDecisionSchema
