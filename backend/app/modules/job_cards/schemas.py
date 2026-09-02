from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.core.schemas import FlowDecisionSchema


class VehicleContext(BaseModel):
    make: str = Field(..., min_length=1, max_length=80)
    model: str = Field(..., min_length=1, max_length=80)
    year: int = Field(..., ge=1990, le=2030)
    fuel_type: str
    transmission: str

    @field_validator("fuel_type")
    @classmethod
    def fuel(cls, value: str) -> str:
        allowed = {"PETROL", "DIESEL", "CNG", "EV"}
        upper = value.upper()
        if upper not in allowed:
            raise ValueError("Invalid fuel_type")
        return upper

    @field_validator("transmission")
    @classmethod
    def trans(cls, value: str) -> str:
        allowed = {"MANUAL", "AUTOMATIC"}
        upper = value.upper()
        if upper not in allowed:
            raise ValueError("Invalid transmission")
        return upper

    @field_validator("make", "model")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()


class ConcernIn(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)

    @field_validator("text")
    @classmethod
    def strip_html(cls, value: str) -> str:
        cleaned = value.replace("<", "").replace(">", "").strip()
        if not cleaned:
            raise ValueError("concern text is empty")
        return cleaned


class CreateJobCardRequest(BaseModel):
    service_offering_slug: str
    vehicle_context: VehicleContext
    concerns: list[ConcernIn] = Field(default_factory=list)
    photo_asset_ids: list[str] = Field(default_factory=list)


class AddJobCardItemRequest(BaseModel):
    kind: str
    repair_offering_slug: str
    quantity: int = Field(1, ge=1, le=10)


class PatchJobCardItemRequest(BaseModel):
    quantity: int = Field(..., ge=1, le=10)


class PatchJobCardRequest(BaseModel):
    concerns: list[ConcernIn]


class JobCardItemOut(BaseModel):
    id: str
    kind: str
    label: str
    unit_price_minor: int
    currency: str = "INR"
    repair_offering_slug: str | None = None
    quantity: int = 1


class JobCardConcernOut(BaseModel):
    id: str
    text: str


class JobCardOut(BaseModel):
    id: str
    public_ref: str
    status: str
    flow_policy: str
    vehicle_context: VehicleContext
    items: list[JobCardItemOut]
    concerns: list[JobCardConcernOut]
    vehicle_id: str | None = None
    address_id: str | None = None
    booking_id: str | None = None
    customer_progress: str | None = None
    parts_status: dict | None = None
    inspection_visit_id: str | None = None
    repair_visit_id: str | None = None
    accepted_inspection_estimate_id: str | None = None


class JobCardEnvelope(BaseModel):
    job_card: JobCardOut
    flow_decision: FlowDecisionSchema


class EstimateLineOut(BaseModel):
    label: str
    amount_minor: int
    kind: str
    is_included: bool = False
    was_amount_minor: int | None = None
    change_type: str | None = None
    repair_offering_slug: str | None = None


class MoneyOut(BaseModel):
    amount_minor: int
    currency: str = "INR"


class EstimateOut(BaseModel):
    id: str
    version: int
    status: str
    total: MoneyOut
    expires_at: datetime | None
    content_hash: str
    source: str | None = None
    parts_advance_amount_minor: int | None = None
    line_items: list[EstimateLineOut]


class PriceResponse(BaseModel):
    estimate: EstimateOut
    flow_decision: FlowDecisionSchema


class AcceptEstimateRequest(BaseModel):
    expected_total_minor: int
    expected_content_hash: str


class AcceptanceOut(BaseModel):
    id: str
    accepted_at: datetime
    accepted_total_minor: int


class AcceptEstimateResponse(BaseModel):
    acceptance: AcceptanceOut
    flow_decision: FlowDecisionSchema


class CustomerFinalization(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=120)
    phone_e164: str = Field(..., min_length=8, max_length=16)

    @field_validator("full_name")
    @classmethod
    def name(cls, value: str) -> str:
        cleaned = "".join(ch for ch in value if ch.isprintable()).strip()
        if not cleaned:
            raise ValueError("full_name must not be empty")
        return cleaned

    @field_validator("phone_e164")
    @classmethod
    def phone(cls, value: str) -> str:
        digits = "".join(ch for ch in value if ch.isdigit())
        if value.startswith("+"):
            e164 = f"+{digits}"
        elif digits.startswith("91") and len(digits) == 12:
            e164 = f"+{digits}"
        elif len(digits) == 10:
            e164 = f"+91{digits}"
        else:
            e164 = f"+{digits}"
        if not e164.startswith("+91") or len(e164) != 13:
            raise ValueError("phone must be Indian E.164")
        return e164


class AddressFinalization(BaseModel):
    line1: str = Field(..., min_length=3, max_length=200)
    locality: str = Field(..., min_length=2, max_length=120)
    city: str = "Bengaluru"
    postal_code: str
    latitude: float | None = None
    longitude: float | None = None
    line2: str | None = None

    @field_validator("postal_code")
    @classmethod
    def postal(cls, value: str) -> str:
        digits = "".join(ch for ch in value if ch.isdigit())
        if len(digits) != 6:
            raise ValueError("postal_code must be 6 digits")
        return digits


class FinalizationRequest(BaseModel):
    customer: CustomerFinalization
    address: AddressFinalization
    vehicle: VehicleContext
    save_vehicle: bool = True
    save_address: bool = True


class FinalizationResponse(BaseModel):
    job_card: JobCardOut
    address_id: str
    vehicle_id: str
    flow_decision: FlowDecisionSchema
