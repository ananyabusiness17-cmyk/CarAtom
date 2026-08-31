from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.modules.catalog.kit_service import VisitKitOut

ScopeKind = Literal["SERVICE", "REPAIR", "INCLUSION"]
ScopeStatus = Literal["PENDING", "IN_PROGRESS", "DONE", "NOT_APPLICABLE"]


class TechnicianScopeLine(BaseModel):
    id: str
    label: str
    kind: str
    status: str


class VisitTag(BaseModel):
    code: str
    label: str


class TechnicianVisitSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    public_ref: str
    job_card_ref: str
    visit_type: str
    status: str
    scheduled_label: str
    distance_km: float | None
    vehicle_label: str
    address_short: str
    allowed_actions: list[str]
    pending_sync: bool = False


class TechnicianVisitDetail(TechnicianVisitSummary):
    concerns: str | None = None
    scope_lines: list[TechnicianScopeLine]
    advisor_note: str | None = None
    customer_name: str
    customer_phone_masked: str
    address_full: str
    parking_notes: str | None = None
    map_preview_url: str | None = None
    tags: list[VisitTag] = Field(default_factory=list)
    plate: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    kit: VisitKitOut | None = None
    actual_start_at: datetime | None = None
    actual_finish_at: datetime | None = None


class VisitListResponse(BaseModel):
    date: str
    timezone: str = "Asia/Kolkata"
    visits: list[TechnicianVisitSummary]
    summary: dict[str, int]


class LocationBody(BaseModel):
    lat: float | None = None
    lng: float | None = None
    accuracy_m: float | None = None
    odometer_km: int | None = Field(default=None, ge=1)


class CompleteVisitBody(BaseModel):
    odometer_km: int | None = Field(default=None, ge=1)



PRICE_KEYS = {"amount_minor", "unit_price", "unit_price_minor", "total_minor", "unit_cost"}


class FindingIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(..., min_length=1, max_length=200)
    severity: str | None = None
    customer_explanation: str = Field(..., min_length=1, max_length=1000)
    recommendation: str | None = Field(default=None, max_length=500)
    repair_category: str | None = None
    media_asset_id: str | None = None


class RecommendedPartIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sku_code: str = Field(..., min_length=1, max_length=80)
    label: str = Field(..., min_length=1, max_length=200)
    quantity: float = Field(1, gt=0)
    notes: str | None = None


class RecommendedLabourIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    description: str = Field(..., min_length=1, max_length=200)
    minutes: int | None = Field(default=None, ge=1, le=24 * 60)


class InspectionFindingsRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    summary: str = Field(..., min_length=1, max_length=500)
    recommendation: str | None = Field(default=None, max_length=500)
    severity: Literal["low", "medium", "high"] | None = None
    media_asset_ids: list[str] = Field(default_factory=list)
    findings: list[FindingIn] = Field(default_factory=list)
    recommended_parts: list[RecommendedPartIn] = Field(default_factory=list)
    recommended_labour: list[RecommendedLabourIn] = Field(default_factory=list)

    @field_validator("recommended_parts")
    @classmethod
    def reject_part_prices(
        cls, lines: list[RecommendedPartIn], info: Any
    ) -> list[RecommendedPartIn]:
        raw = info.data
        del raw
        return lines


class PartLineIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sku_code: str = Field(..., min_length=1, max_length=40)
    label: str = Field(..., min_length=1, max_length=120)
    quantity: float = Field(..., gt=0)
    notes: str | None = None
    intent: str | None = None


class PartsRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    lines: list[PartLineIn]

    @field_validator("lines")
    @classmethod
    def reject_prices(cls, lines: list[PartLineIn], info: Any) -> list[PartLineIn]:
        return lines


class PartsResponse(BaseModel):
    parts_recorded: int


class LabourEntryIn(BaseModel):
    description: str = Field(..., min_length=1, max_length=200)
    minutes: int | None = Field(default=None, ge=1, le=24 * 60)


class LabourRequest(BaseModel):
    entries: list[LabourEntryIn]


class LabourResponse(BaseModel):
    labour_recorded: int


class QcItemIn(BaseModel):
    code: str
    label: str
    passed: bool


class QcRequest(BaseModel):
    items: list[QcItemIn]
    passed: bool
    checklist_version: str = "v1"


class ExceptionRequest(BaseModel):
    summary: str = Field(..., min_length=1, max_length=500)
    requested_action: str = Field(..., min_length=1, max_length=300)
    media_asset_ids: list[str] = Field(default_factory=list)


class ScopeProgressRequest(BaseModel):
    line_id: str
    status: Literal["PENDING", "IN_PROGRESS", "DONE", "NOT_APPLICABLE"]


class LocationPingRequest(BaseModel):
    visit_id: str | None = None
    lat: float
    lng: float
    accuracy_m: float | None = None
    recorded_at: datetime
    client_event_id: str
    force: bool = False


class LocationPingAccepted(BaseModel):
    accepted: bool = True


class TechnicianMeOut(BaseModel):
    technician_id: str
    display_name: str
    on_duty: bool
    skills: list[str]
    today_jobs: int
    status: str


class TechnicianMePatch(BaseModel):
    on_duty: bool


class AssignRequest(BaseModel):
    technician_id: str
    visit_type: str | None = None
    reason: str | None = None


class AssignResponse(BaseModel):
    visit_id: str
    public_ref: str
    status: str
    visit_type: str
    audit_ref: str
    warnings: list[str] = Field(default_factory=list)
    kit: VisitKitOut | None = None


class SignedUploadRequest(BaseModel):
    visit_id: str | None = None
    job_card_id: str | None = None
    filename: str = Field(..., min_length=1, max_length=200)
    content_type: str = Field(..., min_length=3, max_length=80)
    byte_size: int = Field(..., gt=0)
    sha256: str | None = None


class SignedUploadResponse(BaseModel):
    asset_id: str
    upload_url: str
    upload_headers: dict[str, str]
    expires_at: datetime


class MediaConfirmResponse(BaseModel):
    asset_id: str
    status: str
