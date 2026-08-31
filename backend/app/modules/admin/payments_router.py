from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_role
from app.db.session import get_db
from app.modules.admin.payments_service import PaymentsAdminService
from app.modules.admin.schemas import LedgerResponse, OfflinePaymentRequest, RefundRequest

router = APIRouter(tags=["admin-payments"])


@router.get("/payments/ledger", response_model=LedgerResponse)
def payments_ledger(
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[CurrentUser, Depends(require_role("admin"))],
    from_: Annotated[datetime | None, Query(alias="from")] = None,
    to: datetime | None = None,
    method: str | None = None,
    status: str | None = None,
) -> LedgerResponse:
    return PaymentsAdminService(db).ledger(from_dt=from_, to_dt=to, method=method, status=status)


@router.post("/payments/offline", status_code=201)
def record_offline(
    body: OfflinePaymentRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[CurrentUser, Depends(require_role("admin"))],
):
    result = PaymentsAdminService(db).record_offline(
        body, admin, getattr(request.state, "request_id", None)
    )
    db.commit()
    return result


@router.post("/payments/{payment_id}/refund")
def refund_payment(
    payment_id: str,
    body: RefundRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[CurrentUser, Depends(require_role("admin"))],
):
    result = PaymentsAdminService(db).refund(
        payment_id, body, admin, getattr(request.state, "request_id", None)
    )
    db.commit()
    return result
