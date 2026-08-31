from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_user
from app.db.session import get_db
from app.modules.invoices.schemas import InvoiceOut
from app.modules.invoices.service import InvoiceService

router = APIRouter()


@router.get("/bookings/{booking_id}/invoice", response_model=InvoiceOut)
def get_booking_invoice(
    booking_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_user)],
) -> InvoiceOut:
    service = InvoiceService(db)
    invoice = service.get_for_booking(booking_id, user.id, role=user.role)
    return service.to_out(invoice)


@router.get("/invoices/{invoice_id}", response_model=InvoiceOut)
def get_invoice(
    invoice_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_user)],
) -> InvoiceOut:
    service = InvoiceService(db)
    invoice = service.get_by_id(invoice_id, user.id, role=user.role)
    return service.to_out(invoice)
