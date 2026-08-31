from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.orm import Session

from app.common.errors import DomainProblem
from app.core.deps import CurrentUser, get_optional_user
from app.core.idempotency import lookup_idempotency, store_idempotency
from app.db.session import get_db
from app.modules.job_cards.schemas import (
    AcceptEstimateRequest,
    AcceptEstimateResponse,
    AddJobCardItemRequest,
    CreateJobCardRequest,
    FinalizationRequest,
    FinalizationResponse,
    JobCardEnvelope,
    PatchJobCardRequest,
    PriceResponse,
)
from app.modules.job_cards.service import JobCardService

router = APIRouter()


def _request_id(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


@router.post("/job-cards", response_model=JobCardEnvelope, status_code=201)
def create_job_card(
    body: CreateJobCardRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser | None, Depends(get_optional_user)],
) -> JobCardEnvelope:
    return JobCardService(db).create(body, user, _request_id(request))


@router.get("/job-cards/{job_card_id}", response_model=JobCardEnvelope)
def get_job_card(
    job_card_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser | None, Depends(get_optional_user)],
) -> JobCardEnvelope:
    return JobCardService(db).get_envelope(job_card_id, user)


@router.patch("/job-cards/{job_card_id}", response_model=JobCardEnvelope)
def patch_job_card(
    job_card_id: str,
    body: PatchJobCardRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser | None, Depends(get_optional_user)],
) -> JobCardEnvelope:
    return JobCardService(db).patch(job_card_id, body, user, _request_id(request))


@router.post("/job-cards/{job_card_id}/price", response_model=PriceResponse)
def price_job_card(
    job_card_id: str,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser | None, Depends(get_optional_user)],
) -> PriceResponse:
    return JobCardService(db).price(job_card_id, user, _request_id(request))


@router.post(
    "/job-cards/{job_card_id}/estimates/{estimate_id}/accept",
    response_model=AcceptEstimateResponse,
)
def accept_estimate(
    job_card_id: str,
    estimate_id: str,
    body: AcceptEstimateRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser | None, Depends(get_optional_user)],
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> AcceptEstimateResponse:
    route = f"POST /v1/job-cards/{job_card_id}/estimates/{estimate_id}/accept"
    cached = lookup_idempotency(db, idempotency_key, route)
    if cached is not None:
        return AcceptEstimateResponse.model_validate(cached["body"])
    key = idempotency_key or str(uuid4())
    result = JobCardService(db).accept(
        job_card_id, estimate_id, body, user, key, _request_id(request)
    )
    store_idempotency(
        db, idempotency_key, route, 200, result.model_dump(mode="json"), user.id if user else None
    )
    db.commit()
    return result


@router.post("/job-cards/{job_card_id}/finalization", response_model=FinalizationResponse)
def finalize_job_card(
    job_card_id: str,
    body: FinalizationRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser | None, Depends(get_optional_user)],
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> FinalizationResponse:
    if user is None:
        raise DomainProblem(
            401,
            "AUTH_REQUIRED",
            "Sign in to continue booking.",
            allowed_actions=["AUTHENTICATE"],
            request_id=_request_id(request),
        )
    route = f"POST /v1/job-cards/{job_card_id}/finalization"
    cached = lookup_idempotency(db, idempotency_key, route)
    if cached is not None:
        return FinalizationResponse.model_validate(cached["body"])
    result = JobCardService(db).finalize(job_card_id, body, user, _request_id(request))
    store_idempotency(db, idempotency_key, route, 200, result.model_dump(mode="json"), user.id)
    db.commit()
    return result


@router.post("/job-cards/{job_card_id}/items", response_model=JobCardEnvelope, status_code=201)
def add_job_card_item(
    job_card_id: str,
    body: AddJobCardItemRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser | None, Depends(get_optional_user)],
) -> JobCardEnvelope:
    if body.kind != "REPAIR":
        raise DomainProblem(422, "INVALID_OFFERING_FOR_FLOW", "Only REPAIR items can be added.")
    return JobCardService(db).add_repair_item(
        job_card_id,
        body.repair_offering_slug,
        body.quantity,
        user,
        _request_id(request),
    )


@router.delete("/job-cards/{job_card_id}/items/{item_id}", response_model=JobCardEnvelope)
def delete_job_card_item(
    job_card_id: str,
    item_id: str,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser | None, Depends(get_optional_user)],
) -> JobCardEnvelope:
    return JobCardService(db).delete_item(job_card_id, item_id, user, _request_id(request))


@router.post("/job-cards/{job_card_id}/estimates/{estimate_id}/reject")
def reject_estimate(
    job_card_id: str,
    estimate_id: str,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser | None, Depends(get_optional_user)],
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
):
    from app.modules.admin.estimate_publish import EstimatePublishService
    from app.modules.advisor.schemas import RejectEstimateResponse

    if user is None:
        raise DomainProblem(
            401,
            "AUTH_REQUIRED",
            "Sign in to decline an estimate.",
            allowed_actions=["AUTHENTICATE"],
            request_id=_request_id(request),
        )
    route = f"POST /v1/job-cards/{job_card_id}/estimates/{estimate_id}/reject"
    cached = lookup_idempotency(db, idempotency_key, route)
    if cached is not None:
        return RejectEstimateResponse.model_validate(cached["body"])
    result = EstimatePublishService(db).reject(
        job_card_id, estimate_id, user, None, _request_id(request)
    )
    store_idempotency(db, idempotency_key, route, 200, result.model_dump(mode="json"), user.id)
    db.commit()
    return result
