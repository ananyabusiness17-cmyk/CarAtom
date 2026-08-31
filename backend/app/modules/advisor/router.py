from typing import Annotated

from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.orm import Session

from app.common.errors import DomainProblem
from app.core.deps import CurrentUser, get_optional_user
from app.core.idempotency import lookup_idempotency, store_idempotency
from app.db.session import get_db
from app.modules.advisor.schemas import AdvisorCaseEnvelope
from app.modules.advisor.service import AdvisorService

router = APIRouter()


@router.post("/job-cards/{job_card_id}/advisor-case", response_model=AdvisorCaseEnvelope)
def create_advisor_case(
    job_card_id: str,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser | None, Depends(get_optional_user)],
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> AdvisorCaseEnvelope:
    if user is None:
        raise DomainProblem(
            401,
            "AUTH_REQUIRED",
            "Sign in so a sales advisor can call you.",
            allowed_actions=["AUTHENTICATE"],
        )
    route = f"POST /v1/job-cards/{job_card_id}/advisor-case"
    cached = lookup_idempotency(db, idempotency_key, route)
    if cached is not None:
        return AdvisorCaseEnvelope.model_validate(cached["body"])
    result = AdvisorService(db).create_case(
        job_card_id, user, getattr(request.state, "request_id", None)
    )
    store_idempotency(db, idempotency_key, route, 200, result.model_dump(mode="json"), user.id)
    db.commit()
    return result


@router.get("/job-cards/{job_card_id}/advisor-case", response_model=AdvisorCaseEnvelope)
def get_advisor_case(
    job_card_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser | None, Depends(get_optional_user)],
) -> AdvisorCaseEnvelope:
    return AdvisorService(db).get_customer_case(job_card_id, user)
