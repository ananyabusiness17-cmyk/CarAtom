from typing import Annotated

from fastapi import APIRouter, Depends, Header, Query, Request
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_role
from app.db.session import get_db
from app.modules.admin.job_cards_service import AdminJobService
from app.modules.admin.schemas import AdminJobListResponse, AdminJobPatchRequest
from app.modules.admin.surface import clamp_page_limit, parse_client_surface

router = APIRouter(tags=["admin-jobs"])


@router.get("/job-cards", response_model=AdminJobListResponse)
def list_admin_jobs(
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[CurrentUser, Depends(require_role("admin"))],
    q: str | None = None,
    status: str | None = None,
    cursor: str | None = None,
    limit: int | None = None,
    technician_id: str | None = None,
    area_slug: str | None = None,
    needs_dispatch: bool | None = Query(default=None),
    x_client_surface: Annotated[str | None, Header(alias="X-Client-Surface")] = None,
) -> AdminJobListResponse:
    surface = parse_client_surface(x_client_surface)
    page_size = clamp_page_limit(limit, surface=surface)
    return AdminJobService(db).list_jobs(
        q=q,
        status=status,
        cursor=cursor,
        limit=page_size,
        technician_id=technician_id,
        area_slug=area_slug,
        needs_dispatch=needs_dispatch,
    )


@router.patch("/job-cards/{job_card_id}")
def patch_admin_job(
    job_card_id: str,
    body: AdminJobPatchRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[CurrentUser, Depends(require_role("admin"))],
):
    result = AdminJobService(db).patch(
        job_card_id, body, admin, getattr(request.state, "request_id", None)
    )
    db.commit()
    return {"job_card": result}
