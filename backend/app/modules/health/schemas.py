from typing import Literal

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    environment: str
    database: Literal["ok", "degraded", "unavailable"]
    redis: Literal["ok", "unavailable"]
    version: str
    timestamp: str = Field(
        ...,
        json_schema_extra={"examples": ["2026-08-29T12:00:00.000Z"]},
    )
