import hashlib
import json
from typing import Annotated

from fastapi import APIRouter, Depends, Header
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.common.errors import DomainProblem
from app.core.deps import CurrentUser, require_role
from app.core.idempotency import lookup_idempotency, store_idempotency
from app.db.session import get_db
from app.modules.admin.closeout_service import CloseoutListOut, CloseoutService
from app.modules.admin.schemas import DispatchBoardOut
from app.modules.admin.surface import parse_client_surface
from app.modules.catalog.kit_service import KitService, VisitKitOut
from app.modules.dispatch.service import DispatchService
from app.modules.job_cards.models import JobCard
from app.modules.visits.models import Visit
from app.modules.visits.schemas import AssignRequest, AssignResponse

router = APIRouter()


class MassAssignRequest(BaseModel):
    technician_id: str
    job_card_ids: list[str] = Field(..., min_length=1, max_length=40)


def _require_key(key: str | None) -> str:
    if not key:
        raise DomainProblem(400, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key header is required.")
    return key


def _hash_body(payload: object) -> str:
    raw = json.dumps(payload, sort_keys=True, default=str)
    return hashlib.sha256(raw.encode()).hexdigest()


@router.get("/dispatch", response_model=DispatchBoardOut)
def get_dispatch_board(
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[CurrentUser, Depends(require_role("admin"))],
) -> DispatchBoardOut:
    return DispatchService(db).board()


@router.post("/jobs/{job_card_id}/assign", response_model=AssignResponse, status_code=201)
def assign_job(
    job_card_id: str,
    body: AssignRequest,
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[CurrentUser, Depends(require_role("admin"))],
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
    x_client_surface: Annotated[str | None, Header(alias="X-Client-Surface")] = None,
) -> AssignResponse:
    key = _require_key(idempotency_key)
    route = f"POST /v1/admin/jobs/{job_card_id}/assign"
    body_hash = _hash_body(body.model_dump(mode="json"))
    cached = lookup_idempotency(db, key, route, body_hash)
    if cached is not None:
        return AssignResponse.model_validate(cached["body"])
    result = DispatchService(db).assign_to_job_card(
        job_card_id,
        body.technician_id,
        admin,
        visit_type=body.visit_type,
        reason=body.reason,
        client_surface=parse_client_surface(x_client_surface),
    )
    store_idempotency(
        db,
        key,
        route,
        201,
        result.model_dump(mode="json"),
        admin.id,
        body_hash,
    )
    db.commit()
    return result


@router.get("/closeout", response_model=CloseoutListOut)
def get_closeout(
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[CurrentUser, Depends(require_role("admin"))],
    queue: str = "estimate_unpublished",
) -> CloseoutListOut:
    return CloseoutService(db).list_queue(queue)


@router.get("/visits/{visit_id}/kit", response_model=VisitKitOut)
def get_visit_kit(
    visit_id: str,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[CurrentUser, Depends(require_role("admin"))],
) -> VisitKitOut:
    visit = db.get(Visit, visit_id)
    if visit is None:
        raise DomainProblem(404, "NOT_FOUND", "Visit not found.")
    return KitService(db).kit_for_visit(visit)


@router.get("/jobs/{job_card_id}/kit", response_model=VisitKitOut)
def get_job_kit(
    job_card_id: str,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[CurrentUser, Depends(require_role("admin"))],
) -> VisitKitOut:
    job = db.get(JobCard, job_card_id)
    if job is None:
        raise DomainProblem(404, "NOT_FOUND", "Job not found.")
    return KitService(db).kit_for_job(job, van_code=None, visit_id=None)


@router.post("/dispatch/mass-assign")
def mass_assign(
    body: MassAssignRequest,
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[CurrentUser, Depends(require_role("admin"))],
):
    result = DispatchService(db).mass_assign(body.job_card_ids, body.technician_id, admin)
    db.commit()
    return result
