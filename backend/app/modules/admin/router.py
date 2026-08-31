from typing import Annotated

from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_role
from app.core.idempotency import lookup_idempotency, store_idempotency
from app.db.session import get_db
from app.modules.admin.advisor_cases_router import AdminAdvisorService
from app.modules.admin.estimate_publish import EstimatePublishService
from app.modules.admin.job_cards_service import AdminJobService
from app.modules.advisor.schemas import (
    AdminPublishEstimateRequest,
    AdminPublishEstimateResponse,
    InboxResponse,
)
from app.modules.inspections.service import InspectionService
from app.modules.job_cards.service import JobCardService
from app.modules.parts.service import PartsService

router = APIRouter()


@router.get("/advisor-cases", response_model=InboxResponse)
def list_advisor_cases(
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[CurrentUser, Depends(require_role("admin"))],
) -> InboxResponse:
    return AdminAdvisorService(db).inbox()


@router.get("/job-cards/{job_card_id}")
def get_admin_job_card(
    job_card_id: str,
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[CurrentUser, Depends(require_role("admin"))],
    view: str | None = None,
):
    if view == "lite":
        return AdminJobService(db).get_lite(job_card_id)
    return AdminAdvisorService(db).get_job(job_card_id, admin)


@router.post("/job-cards/{job_card_id}/estimate", response_model=AdminPublishEstimateResponse)
def publish_admin_estimate(
    job_card_id: str,
    body: AdminPublishEstimateRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[CurrentUser, Depends(require_role("admin"))],
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> AdminPublishEstimateResponse:
    route = f"POST /v1/admin/job-cards/{job_card_id}/estimate"
    cached = lookup_idempotency(db, idempotency_key, route)
    if cached is not None:
        return AdminPublishEstimateResponse.model_validate(cached["body"])
    result = EstimatePublishService(db).publish(
        job_card_id, body, admin, getattr(request.state, "request_id", None)
    )
    store_idempotency(db, idempotency_key, route, 200, result.model_dump(mode="json"), admin.id)
    db.commit()
    return result


@router.post("/job-cards/{job_card_id}/parts-ready")
def admin_parts_ready(
    job_card_id: str,
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[CurrentUser, Depends(require_role("admin"))],
):
    job_card = JobCardService(db).get_accessible(job_card_id, admin)
    PartsService(db).mark_ready(job_card, admin.id)
    db.commit()
    loaded = JobCardService(db).repo.get(job_card_id)
    assert loaded is not None
    from app.modules.inspection_repair.progress import customer_progress

    return {
        "job_card_id": loaded.id,
        "status": loaded.status,
        "customer_progress": customer_progress(loaded),
        "parts_status": PartsService(db).status_payload(loaded),
    }


@router.post("/job-cards/{job_card_id}/inspection-estimate")
def admin_publish_inspection_estimate(
    job_card_id: str,
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[CurrentUser, Depends(require_role("admin"))],
):
    job_card = JobCardService(db).get_accessible(job_card_id, admin)
    estimate = InspectionService(db).publish_estimate_from_findings(job_card, actor_id=admin.id)
    db.commit()
    return {
        "estimate_id": estimate.id,
        "total": {"amount_minor": estimate.total_minor, "currency": estimate.currency},
        "source": estimate.source,
    }
