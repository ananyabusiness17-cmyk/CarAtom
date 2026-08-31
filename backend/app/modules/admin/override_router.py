from typing import Annotated

from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_role
from app.core.idempotency import lookup_idempotency, store_idempotency
from app.db.session import get_db
from app.modules.admin.override_service import OverrideService
from app.modules.admin.schemas import AllowedOverrideActionsOut, OverrideRequest, OverrideResponse
from app.modules.admin.surface import parse_client_surface

router = APIRouter(tags=["admin-jobs"])


@router.get(
    "/job-cards/{job_card_id}/allowed-override-actions", response_model=AllowedOverrideActionsOut
)
def allowed_override_actions(
    job_card_id: str,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[CurrentUser, Depends(require_role("admin"))],
    x_client_surface: Annotated[str | None, Header(alias="X-Client-Surface")] = None,
) -> AllowedOverrideActionsOut:
    return OverrideService(db).allowed_actions(
        job_card_id, surface=parse_client_surface(x_client_surface)
    )


@router.post("/job-cards/{job_card_id}/override", response_model=OverrideResponse)
def apply_override(
    job_card_id: str,
    body: OverrideRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[CurrentUser, Depends(require_role("admin"))],
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
    x_client_surface: Annotated[str | None, Header(alias="X-Client-Surface")] = None,
) -> OverrideResponse:
    route = f"POST /v1/admin/job-cards/{job_card_id}/override"
    cached = lookup_idempotency(db, idempotency_key, route)
    if cached is not None:
        return OverrideResponse.model_validate(cached["body"])
    result = OverrideService(db).apply(
        job_card_id,
        body,
        admin,
        getattr(request.state, "request_id", None),
        client_surface=parse_client_surface(x_client_surface),
    )
    store_idempotency(db, idempotency_key, route, 200, result.model_dump(mode="json"), admin.id)
    db.commit()
    return result
