from typing import Annotated

from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_role, require_user
from app.core.idempotency import lookup_idempotency, store_idempotency
from app.db.session import get_db
from app.modules.support.schemas import (
    AdminPatchSupportTicketRequest,
    CreateSupportTicketRequest,
    SupportTicketListResponse,
    SupportTicketOut,
)
from app.modules.support.service import SupportService

router = APIRouter()
admin_router = APIRouter()


@router.post("/support-tickets", response_model=SupportTicketOut, status_code=201)
def create_support_ticket(
    body: CreateSupportTicketRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_user)],
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> SupportTicketOut:
    route = "POST /v1/support-tickets"
    cached = lookup_idempotency(db, idempotency_key, route)
    if cached is not None:
        return SupportTicketOut.model_validate(cached["body"])
    result = SupportService(db).create_roadside(body, user)
    store_idempotency(db, idempotency_key, route, 201, result.model_dump(mode="json"), user.id)
    db.commit()
    return result


@router.get("/support-tickets", response_model=SupportTicketListResponse)
def list_support_tickets(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_user)],
    cursor: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
) -> SupportTicketListResponse:
    return SupportService(db).list_mine(user, cursor, limit)


@router.get("/support-tickets/{ticket_id}", response_model=SupportTicketOut)
def get_support_ticket(
    ticket_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_user)],
) -> SupportTicketOut:
    return SupportService(db).get_for_customer(ticket_id, user)


@router.post("/support-tickets/{ticket_id}/cancel", response_model=SupportTicketOut)
def cancel_support_ticket(
    ticket_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_user)],
) -> SupportTicketOut:
    result = SupportService(db).cancel(ticket_id, user)
    db.commit()
    return result


@admin_router.patch("/support-tickets/{ticket_id}", response_model=SupportTicketOut)
def admin_patch_support_ticket(
    ticket_id: str,
    body: AdminPatchSupportTicketRequest,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[CurrentUser, Depends(require_role("admin"))],
) -> SupportTicketOut:
    result = SupportService(db).admin_patch(ticket_id, body)
    db.commit()
    return result
