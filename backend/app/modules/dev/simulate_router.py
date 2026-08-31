from typing import Annotated

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.common.errors import DomainProblem
from app.core.deps import CurrentUser, get_optional_user, require_user
from app.core.dev_guard import require_dev_admin, require_dev_environment
from app.db.session import get_db
from app.modules.admin.estimate_publish import CANNED_REVISION_LINES, EstimatePublishService
from app.modules.advisor.repository import AdvisorRepository
from app.modules.advisor.schemas import AdminPublishEstimateRequest, AdminPublishEstimateResponse
from app.modules.invoices.service import InvoiceService
from app.modules.job_cards.service import JobCardService
from app.modules.payments.webhook import process_razorpay_webhook

router = APIRouter()


@router.post(
    "/job-cards/{job_card_id}/simulate-advisor-estimate",
    response_model=AdminPublishEstimateResponse,
)
def simulate_advisor_estimate(
    job_card_id: str,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser | None, Depends(get_optional_user)],
) -> AdminPublishEstimateResponse:
    admin = require_dev_admin(user)
    job_cards = JobCardService(db)
    job = job_cards.get_accessible(job_card_id, admin)
    case = AdvisorRepository(db).get_by_job_card_id(job.id)
    if case is None:
        raise DomainProblem(
            409,
            "ADVISOR_CASE_NOT_OPEN",
            "Create an advisor case before simulating a revised estimate.",
            allowed_actions=["CREATE_ADVISOR_CASE"],
        )
    body = AdminPublishEstimateRequest(
        lines=CANNED_REVISION_LINES,
        advisor_case_id=case.id,
        publish_to_customer=True,
        revision_notes_customer_safe="Brake pads upgraded; fluid flush added on call.",
    )
    return EstimatePublishService(db).publish(
        job_card_id, body, admin, getattr(request.state, "request_id", None)
    )


class IssueInvoiceRequest(BaseModel):
    booking_id: str
    force: bool = True


@router.post("/simulate/issue-invoice")
def simulate_issue_invoice(
    body: IssueInvoiceRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_user)],
):
    require_dev_environment()
    invoice = InvoiceService(db).issue_for_booking(body.booking_id, force=body.force)
    db.commit()
    return InvoiceService(db).to_out(invoice)


@router.post("/simulate/razorpay-webhook")
async def simulate_razorpay_webhook(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_user)],
):
    require_dev_environment()
    body = await request.body()
    result = process_razorpay_webhook(db, body=body, signature=None, require_signature=False)
    db.commit()
    return result
