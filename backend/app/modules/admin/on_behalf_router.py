from typing import Annotated

from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_role
from app.core.idempotency import lookup_idempotency, store_idempotency
from app.db.session import get_db
from app.modules.admin.on_behalf_service import OnBehalfBookingService
from app.modules.admin.schemas import OnBehalfRequest, OnBehalfResponse

router = APIRouter(tags=["admin-jobs"])


@router.post("/bookings/on-behalf", response_model=OnBehalfResponse, status_code=201)
def on_behalf_book(
    body: OnBehalfRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[CurrentUser, Depends(require_role("admin"))],
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> OnBehalfResponse:
    route = "POST /v1/admin/bookings/on-behalf"
    cached = lookup_idempotency(db, idempotency_key, route)
    if cached is not None:
        return OnBehalfResponse.model_validate(cached["body"])
    result = OnBehalfBookingService(db).create(
        body, admin, getattr(request.state, "request_id", None)
    )
    store_idempotency(db, idempotency_key, route, 201, result.model_dump(mode="json"), admin.id)
    db.commit()
    return result
