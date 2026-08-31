from datetime import datetime

from pydantic import BaseModel, Field


class CreateSupportTicketRequest(BaseModel):
    ticket_type: str = "ROADSIDE"
    issue_code: str = Field(..., min_length=1, max_length=40)
    issue_label: str = Field(..., min_length=1, max_length=80)
    latitude: float | None = None
    longitude: float | None = None
    location_label: str | None = Field(default=None, max_length=160)


class SupportTicketOut(BaseModel):
    id: str
    public_ref: str
    status: str
    ticket_type: str
    issue_code: str
    issue_label: str
    location_label: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    dispatched_partner_label: str | None = None
    eta_minutes: int | None = None
    allowed_actions: list[str]
    ops_phone_e164: str | None = None
    created_at: datetime


class SupportTicketListResponse(BaseModel):
    items: list[SupportTicketOut]
    next_cursor: str | None = None


class AdminPatchSupportTicketRequest(BaseModel):
    status: str
    dispatched_partner_label: str | None = None
    eta_minutes: int | None = None
