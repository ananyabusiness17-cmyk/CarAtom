from typing import Annotated

from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_user
from app.core.idempotency import lookup_idempotency, store_idempotency
from app.db.session import get_db
from app.modules.payments.schemas import PaymentOrderRequest, PaymentOrderResponse, PaymentOut
from app.modules.payments.service import PaymentService
from app.modules.payments.webhook import process_razorpay_webhook

router = APIRouter()


@router.post(
    "/invoices/{invoice_id}/payment-order",
    response_model=PaymentOrderResponse,
    status_code=201,
)
def create_payment_order(
    invoice_id: str,
    body: PaymentOrderRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_user)],
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> PaymentOrderResponse:
    route = f"POST /v1/invoices/{invoice_id}/payment-order"
    cached = lookup_idempotency(db, idempotency_key, route)
    if cached is not None:
        return PaymentOrderResponse.model_validate(cached["body"])
    result = PaymentService(db).create_payment_order(
        invoice_id, body.purpose, user, idempotency_key
    )
    store_idempotency(db, idempotency_key, route, 201, result.model_dump(mode="json"), user.id)
    db.commit()
    return result


@router.get("/payments/{payment_id}", response_model=PaymentOut)
def get_payment(
    payment_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_user)],
) -> PaymentOut:
    service = PaymentService(db)
    payment = service.get_for_user(payment_id, user)
    return service.to_out(payment)


@router.post("/payments/webhook/razorpay")
async def razorpay_webhook(request: Request, db: Annotated[Session, Depends(get_db)]) -> dict:
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature")
    result = process_razorpay_webhook(db, body=body, signature=signature, require_signature=True)
    db.commit()
    return result
