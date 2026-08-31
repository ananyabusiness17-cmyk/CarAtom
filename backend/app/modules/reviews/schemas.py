from pydantic import BaseModel, Field


class ReviewCreateRequest(BaseModel):
    booking_id: str
    rating: int = Field(..., ge=1, le=5)
    comment: str | None = Field(default=None, max_length=2000)


class ReviewOut(BaseModel):
    id: str
    booking_id: str
    rating: int
    comment: str | None = None
    submitted_at: str
