from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class AddressIn(BaseModel):
    line1: str = Field(..., min_length=3, max_length=200)
    locality: str = Field(..., min_length=2, max_length=120)
    city: str = "Bengaluru"
    postal_code: str
    latitude: float | None = None
    longitude: float | None = None
    line2: str | None = None
    label: str | None = None
    is_default: bool = False

    @field_validator("postal_code")
    @classmethod
    def postal(cls, value: str) -> str:
        digits = "".join(ch for ch in value if ch.isdigit())
        if len(digits) != 6:
            raise ValueError("postal_code must be 6 digits")
        return digits


class AddressOut(BaseModel):
    id: str
    line1: str
    locality: str
    city: str
    postal_code: str
    latitude: float | None = None
    longitude: float | None = None
    is_default: bool
    is_archived: bool
    created_at: datetime


class AddressListResponse(BaseModel):
    items: list[AddressOut]
