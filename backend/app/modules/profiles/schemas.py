from datetime import UTC, datetime

from pydantic import BaseModel, Field, field_serializer, field_validator


class MeResponse(BaseModel):
    id: str
    phone: str | None
    full_name: str | None
    role: str
    phone_verified: bool
    created_at: datetime

    @field_serializer("created_at")
    def serialize_created_at(self, value: datetime) -> str:
        if value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        return value.astimezone(UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z")


class ProfilePatchRequest(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=120)

    @field_validator("full_name")
    @classmethod
    def strip_controls(cls, value: str) -> str:
        cleaned = "".join(ch for ch in value if ch.isprintable()).strip()
        if not cleaned:
            raise ValueError("full_name must not be empty")
        return cleaned
