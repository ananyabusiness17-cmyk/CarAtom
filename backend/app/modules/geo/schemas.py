from pydantic import BaseModel, Field


class ReverseGeocodeOut(BaseModel):
    label: str
    line1: str | None = None
    locality: str | None = None
    city: str | None = None
    postal_code: str | None = None
    latitude: float
    longitude: float
    source: str = "nominatim"


class GeocodeSearchResponse(BaseModel):
    items: list[ReverseGeocodeOut] = Field(default_factory=list)
