from typing import Annotated

from fastapi import APIRouter, Depends, Header, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.common.errors import DomainProblem
from app.core.deps import CurrentUser, get_optional_user, require_user
from app.core.dev_guard import require_dev_environment
from app.core.idempotency import lookup_idempotency, store_idempotency
from app.db.session import get_db
from app.modules.bookings.schemas import BookResponse
from app.modules.bookings.service import BookingService
from app.modules.inspections.service import InspectionService
from app.modules.job_cards.service import JobCardService, to_flow_schema
from app.modules.parts.service import PartsService
from app.modules.payments.models import Payment
from app.modules.payments.parts_advance import PartsAdvanceService
from app.modules.payments.razorpay_client import public_razorpay_key_id
from app.modules.payments.service import PaymentService

router = APIRouter()


class PartsAdvanceOrderRequest(BaseModel):
    estimate_id: str
    expected_amount_minor: int = Field(..., ge=1)


class BookRepairRequest(BaseModel):
    slot_hold_id: str
    visit_type: str = "REPAIR"


class RescheduleRequest(BaseModel):
    slot_hold_id: str


@router.get("/job-cards/{job_card_id}/inspection-findings")
def get_inspection_findings(
    job_card_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser | None, Depends(get_optional_user)],
):
    job_cards = JobCardService(db)
    job_card = job_cards.get_accessible(job_card_id, user)
    payload = InspectionService(db).customer_findings(job_card)
    dumped = str(payload)
    if "unit_cost" in dumped:
        raise DomainProblem(500, "INTERNAL", "Unsafe findings payload.")
    estimate = job_cards.estimates.latest_for_job(job_card.id)
    payload["flow_decision"] = to_flow_schema(job_cards._decision(job_card, estimate)).model_dump(
        mode="json"
    )
    payload["version"] = job_card.version
    payload["updated_at"] = job_card.updated_at.isoformat() if job_card.updated_at else None
    return payload


@router.get("/job-cards/{job_card_id}/parts-status")
def get_parts_status(
    job_card_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_user)],
):
    job_card = JobCardService(db).get_accessible(job_card_id, user)
    return PartsService(db).status_payload(job_card)


@router.post("/job-cards/{job_card_id}/parts-advance/payment-order")
def create_parts_advance_order(
    job_card_id: str,
    body: PartsAdvanceOrderRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_user)],
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
):
    route = f"POST /v1/job-cards/{job_card_id}/parts-advance/payment-order"
    cached = lookup_idempotency(db, idempotency_key, route)
    if cached is not None:
        return cached["body"]
    job_card = JobCardService(db).get_accessible(job_card_id, user)
    payment = PartsAdvanceService(db).create_order(
        job_card, body.estimate_id, body.expected_amount_minor, user.id
    )
    db.commit()
    result = {
        "payment_id": payment.id,
        "purpose": "PARTS_ADVANCE",
        "razorpay_order_id": payment.razorpay_order_id,
        "amount": {"amount_minor": payment.amount_minor, "currency": payment.currency},
        "key_id": public_razorpay_key_id(),
        "verification_pending": payment.status != "CAPTURED",
    }
    store_idempotency(db, idempotency_key, route, 200, result, user.id)
    db.commit()
    return result


@router.post("/job-cards/{job_card_id}/book-repair", response_model=BookResponse, status_code=201)
def book_repair(
    job_card_id: str,
    body: BookRepairRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_user)],
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> BookResponse:
    if body.visit_type != "REPAIR":
        raise DomainProblem(
            409,
            "VISIT_TYPE_MISMATCH",
            "Visit 2 must be booked as a repair.",
            allowed_actions=["SELECT_REPAIR_SLOT"],
        )
    route = f"POST /v1/job-cards/{job_card_id}/book-repair"
    cached = lookup_idempotency(db, idempotency_key, route)
    if cached is not None:
        return BookResponse.model_validate(cached["body"])
    result = BookingService(db).book_repair(
        job_card_id, body.slot_hold_id, user, getattr(request.state, "request_id", None)
    )
    store_idempotency(db, idempotency_key, route, 201, result.model_dump(mode="json"), user.id)
    db.commit()
    return result


@router.post("/bookings/{booking_id}/reschedule", response_model=BookResponse)
def reschedule_booking(
    booking_id: str,
    body: RescheduleRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_user)],
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> BookResponse:
    route = f"POST /v1/bookings/{booking_id}/reschedule"
    cached = lookup_idempotency(db, idempotency_key, route)
    if cached is not None:
        return BookResponse.model_validate(cached["body"])
    result = BookingService(db).reschedule(
        booking_id, body.slot_hold_id, user, getattr(request.state, "request_id", None)
    )
    store_idempotency(db, idempotency_key, route, 200, result.model_dump(mode="json"), user.id)
    db.commit()
    return result


@router.post("/dev/payments/{payment_id}/capture")
def capture_payment_dev(
    payment_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_user)],
):
    require_dev_environment()
    payment = db.get(Payment, payment_id)
    if payment is None:
        raise DomainProblem(404, "NOT_FOUND", "Not found.")
    JobCardService(db).get_accessible(payment.job_card_id, user)
    PaymentService(db).apply_capture(payment, provider_payment_id=f"pay_dev_{payment.id[:8]}")
    db.commit()
    return {"payment_id": payment.id, "status": payment.status}
