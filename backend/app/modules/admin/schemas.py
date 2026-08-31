from datetime import datetime

from pydantic import BaseModel, Field


class CatalogOfferingRow(BaseModel):
    slug: str
    name: str
    display_price_minor: int | None = None
    display_label: str
    kind: str
    is_active: bool
    version: int = 1
    duration_minutes: int | None = None
    flow_policy: str | None = None
    id: str | None = None


class CatalogOverviewResponse(BaseModel):
    offerings: list[CatalogOfferingRow]
    parts_advance_percent: int
    second_vehicle_discount_percent: int
    service_hours: dict | None = None
    service_radius_km: int | None = None
    note: str = "Customer app reads these live. No hardcoded prices."


class PatchOfferingRequest(BaseModel):
    display_price_minor: int | None = Field(None, ge=0)
    is_active: bool | None = None
    name: str | None = None
    duration_minutes: int | None = None
    expected_version: int | None = None
    sort_order: int | None = None


class PatchOfferingResponse(BaseModel):
    slug: str
    display_price_minor: int | None = None
    version: int
    effective_at: datetime
    audit_id: str


class PatchSettingsRequest(BaseModel):
    parts_advance_percent: int | None = Field(None, ge=0, le=100)
    second_vehicle_discount_percent: int | None = Field(None, ge=0, le=100)
    service_hours: dict | None = None
    service_radius_km: int | None = Field(None, ge=1, le=50)


class PeopleRow(BaseModel):
    id: str
    kind: str
    display_name: str
    masked_phone: str | None = None
    subtitle: str
    status_chip: str | None = None
    technician_id: str | None = None
    is_disabled: bool = False


class PeopleListResponse(BaseModel):
    items: list[PeopleRow]


class CustomerDetailOut(BaseModel):
    id: str
    full_name: str | None = None
    phone_e164: str | None = None
    masked_phone: str | None = None
    is_disabled: bool
    vehicles: list[dict]
    recent_jobs: list[dict]


class CreateTechnicianRequest(BaseModel):
    display_name: str = Field(..., min_length=2, max_length=80)
    phone_e164: str
    skills: list[str] = Field(default_factory=list)
    van_code: str | None = None
    employee_code: str | None = None


class DisableProfileRequest(BaseModel):
    reason: str = Field(..., min_length=1)


class DisableProfileResponse(BaseModel):
    id: str
    is_disabled: bool
    audit_id: str


class DossierJobOut(BaseModel):
    visit_id: str
    label: str
    status: str
    job_card_ref: str


class TechnicianDossierOut(BaseModel):
    technician: dict
    location: dict
    today: dict
    week_stats: dict
    parts_fitted_week: list[dict]


class LedgerRowOut(BaseModel):
    id: str
    job_card_ref: str
    label: str
    amount_minor: int
    currency: str = "INR"
    method: str
    status: str
    created_at: datetime
    payment_id: str | None = None


class LedgerResponse(BaseModel):
    items: list[LedgerRowOut]
    next_cursor: str | None = None
    daily_total: dict


class OfflinePaymentRequest(BaseModel):
    job_card_id: str | None = None
    job_card_ref: str | None = None
    invoice_id: str | None = None
    amount_minor: int = Field(..., ge=1)
    method: str = "CASH"
    reference: str | None = None
    reason: str = Field(..., min_length=1)


class RefundRequest(BaseModel):
    amount_minor: int | None = Field(None, ge=1)
    reason: str = Field(..., min_length=1)


class OnBehalfRequest(BaseModel):
    customer_profile_id: str
    service_offering_slug: str
    vehicle_id: str | None = None
    slot_id: str
    concerns: list[dict] = Field(default_factory=list)
    admin_note: str | None = None
    address_id: str | None = None


class OnBehalfResponse(BaseModel):
    job_card_id: str
    public_ref: str
    booking_id: str
    audit_id: str


class OverrideRequest(BaseModel):
    command: str = ""
    action: str | None = None
    target_status: str | None = None
    reason: str = ""
    payload: dict = Field(default_factory=dict)

    def resolved_command(self) -> str:
        aliases = {
            "MOVE_VISIT_SLOT": "MOVE_SLOT",
            "DESK_COMPLETE_VISIT": "DESK_COMPLETE",
        }
        raw = (self.action or self.command or "").strip().upper()
        return aliases.get(raw, raw)


class OverrideResponse(BaseModel):
    job_card: dict
    audit_id: str
    audit_ref: str | None = None


class AssignedTechnicianOut(BaseModel):
    id: str
    name: str


class AdminJobListItem(BaseModel):
    id: str
    public_ref: str
    ref: str | None = None
    customer_name: str | None = None
    status: str
    status_label: str | None = None
    policy_label: str | None = None
    vehicle_label: str | None = None
    area_label: str | None = None
    visit_window_label: str | None = None
    assigned_technician: AssignedTechnicianOut | None = None
    estimate_total_minor: int | None = None
    payment_chip: str | None = None
    needs_dispatch: bool = False
    visit_id: str | None = None
    technician_name: str | None = None
    locality: str | None = None
    updated_at: datetime
    payment_status: str | None = None


class AdminJobListResponse(BaseModel):
    items: list[AdminJobListItem]
    next_cursor: str | None = None


class AdminJobLiteLineOut(BaseModel):
    name: str
    amount_minor: int


class AdminJobLiteOut(AdminJobListItem):
    concerns: list[str] = Field(default_factory=list)
    lines: list[AdminJobLiteLineOut] = Field(default_factory=list)
    lines_omitted_count: int = 0
    van_label: str | None = None
    allowed_status_targets: list[str] = Field(default_factory=list)


class DispatchLaneVisitOut(BaseModel):
    visit_id: str
    job_card_id: str
    job_card_ref: str
    vehicle_label: str
    visit_window_label: str | None = None
    status: str
    scheduled_start_at: datetime
    scheduled_end_at: datetime
    latitude: float | None = None
    longitude: float | None = None


class DispatchTechnicianOut(BaseModel):
    id: str
    name: str
    duty_status: str
    skills_label: str
    active_jobs_count: int
    van_label: str | None = None
    last_ping_label: str | None = None
    area_label: str | None = None
    assigned_visits: list[DispatchLaneVisitOut] = Field(default_factory=list)


class DispatchUnassignedJobOut(BaseModel):
    visit_id: str
    job_card_id: str
    job_card_ref: str
    vehicle_label: str
    visit_window_label: str | None = None
    scheduled_start_at: datetime | None = None
    scheduled_end_at: datetime | None = None
    latitude: float | None = None
    longitude: float | None = None


class DispatchBoardOut(BaseModel):
    technicians: list[DispatchTechnicianOut]
    unassigned_jobs: list[DispatchUnassignedJobOut]


class AllowedOverrideActionsOut(BaseModel):
    actions: list[str]
    allowed_targets: list[str] = Field(default_factory=list)


class AdminJobPatchRequest(BaseModel):
    concerns: list[dict] | None = None
    notes: str | None = None


class AuditLogRowOut(BaseModel):
    id: str
    created_at: datetime
    actor_display_name: str
    actor_role: str
    command: str
    resource_type: str
    resource_id: str
    reason: str | None = None
    request_id: str | None = None
    before_summary: dict | None = None
    after_summary: dict | None = None


class AuditLogListResponse(BaseModel):
    items: list[AuditLogRowOut]
    next_cursor: str | None = None
