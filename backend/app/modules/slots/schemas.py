from datetime import datetime

from pydantic import BaseModel, Field

from app.core.schemas import FlowDecisionSchema


class SlotOut(BaseModel):
    slot_id: str
    starts_at: datetime
    ends_at: datetime
    label: str
    available: bool


class SlotsResponse(BaseModel):
    timezone: str = "Asia/Kolkata"
    visit_duration_minutes: int = 120
    slots: list[SlotOut]


class CreateHoldRequest(BaseModel):
    slot_id: str = Field(..., min_length=10)


class HoldOut(BaseModel):
    id: str
    slot_starts_at: datetime
    slot_ends_at: datetime
    expires_at: datetime
    status: str


class HoldResponse(BaseModel):
    hold: HoldOut
    flow_decision: FlowDecisionSchema
