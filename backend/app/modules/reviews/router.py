from typing import Annotated

from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_user
from app.core.idempotency import lookup_idempotency, store_idempotency
from app.db.session import get_db
from app.modules.reviews.schemas import ReviewCreateRequest, ReviewOut
from app.modules.reviews.service import ReviewService

router = APIRouter()


@router.post("/reviews", response_model=ReviewOut)
def create_review(
    body: ReviewCreateRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_user)],
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> ReviewOut:
    route = "POST /v1/reviews"
    cached = lookup_idempotency(db, idempotency_key, route)
    if cached is not None:
        return ReviewOut.model_validate(cached["body"])
    service = ReviewService(db)
    review, created = service.submit(body, user)
    status = 201 if created else 200
    store_idempotency(db, idempotency_key, route, status, review.model_dump(mode="json"), user.id)
    db.commit()
    return review
