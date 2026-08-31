from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Header, Query, Request
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_user
from app.core.idempotency import lookup_idempotency, store_idempotency
from app.db.session import get_db
from app.modules.slots.schemas import CreateHoldRequest, HoldResponse, SlotsResponse
from app.modules.slots.service import SlotService

router = APIRouter()


@router.get("/job-cards/{job_card_id}/slots", response_model=SlotsResponse)
def list_slots(
    job_card_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_user)],
    from_date: date = Query(alias="from"),
    to_date: date = Query(alias="to"),
    visit_type: str = "SERVICE",
) -> SlotsResponse:
    return SlotService(db).list_slots(job_card_id, user, from_date, to_date, visit_type)


@router.post("/job-cards/{job_card_id}/slot-holds", response_model=HoldResponse, status_code=201)
def create_hold(
    job_card_id: str,
    body: CreateHoldRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_user)],
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> HoldResponse:
    del request
    route = f"POST /v1/job-cards/{job_card_id}/slot-holds"
    cached = lookup_idempotency(db, idempotency_key, route)
    if cached is not None:
        return HoldResponse.model_validate(cached["body"])
    result = SlotService(db).create_hold(job_card_id, body.slot_id, user, idempotency_key)
    store_idempotency(db, idempotency_key, route, 201, result.model_dump(mode="json"), user.id)
    db.commit()
    return result
