from typing import Annotated

from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_user
from app.core.idempotency import lookup_idempotency, store_idempotency
from app.db.session import get_db
from app.modules.bookings.list_service import BookingListService
from app.modules.bookings.schemas import (
    BookingDetailResponse,
    BookingListResponse,
    BookRequest,
    BookResponse,
)
from app.modules.bookings.service import BookingService

router = APIRouter()


@router.get("/bookings", response_model=BookingListResponse)
def list_bookings(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_user)],
    cursor: str | None = None,
    limit: int = 20,
) -> BookingListResponse:
    capped = min(max(limit, 1), 50)
    return BookingListService(db).list_for(user.id, cursor, capped)


@router.post("/job-cards/{job_card_id}/book", response_model=BookResponse, status_code=201)
def book_job_card(
    job_card_id: str,
    body: BookRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_user)],
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> BookResponse:
    route = f"POST /v1/job-cards/{job_card_id}/book"
    cached = lookup_idempotency(db, idempotency_key, route)
    if cached is not None:
        return BookResponse.model_validate(cached["body"])
    result = BookingService(db).confirm(
        job_card_id,
        body.slot_hold_id,
        user,
        getattr(request.state, "request_id", None),
        visit_type=body.visit_type,
    )
    store_idempotency(db, idempotency_key, route, 201, result.model_dump(mode="json"), user.id)
    db.commit()
    return result


@router.get("/bookings/{booking_id}", response_model=BookingDetailResponse)
def get_booking(
    booking_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_user)],
) -> BookingDetailResponse:
    return BookingService(db).get(booking_id, user)
