from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class VehicleIn(BaseModel):
    make: str = Field(..., min_length=1, max_length=80)
    model: str = Field(..., min_length=1, max_length=80)
    year: int = Field(..., ge=1990, le=2030)
    fuel_type: str
    transmission: str
    registration_number: str | None = None
    variant: str | None = None
    mileage_km: int | None = None

    @field_validator("fuel_type")
    @classmethod
    def fuel(cls, value: str) -> str:
        upper = value.upper()
        if upper not in {"PETROL", "DIESEL", "CNG", "EV"}:
            raise ValueError("Invalid fuel_type")
        return upper

    @field_validator("transmission")
    @classmethod
    def trans(cls, value: str) -> str:
        upper = value.upper()
        if upper not in {"MANUAL", "AUTOMATIC"}:
            raise ValueError("Invalid transmission")
        return upper


class VehicleOut(BaseModel):
    id: str
    make: str
    model: str
    year: int
    fuel_type: str
    transmission: str
    is_archived: bool
    created_at: datetime
    mileage_km: int | None = None


class VehicleListResponse(BaseModel):
    items: list[VehicleOut]


class VehicleServiceLogOut(BaseModel):
    id: str
    vehicle_id: str
    visit_id: str | None = None
    offering_slug: str | None = None
    invoice_total_minor: int | None = None
    odometer_km: int | None = None
    notes: str | None = None
    created_at: datetime


class VehicleServiceLogList(BaseModel):
    items: list[VehicleServiceLogOut]
