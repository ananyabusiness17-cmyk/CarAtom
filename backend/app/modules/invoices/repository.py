from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.modules.invoices.models import Invoice, InvoiceLineItem


class InvoiceRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, invoice_id: str) -> Invoice | None:
        return self.db.scalar(
            select(Invoice)
            .where(Invoice.id == invoice_id)
            .options(selectinload(Invoice.line_items))
        )

    def get_by_booking(self, booking_id: str, *, include_void: bool = False) -> Invoice | None:
        query = (
            select(Invoice)
            .where(Invoice.booking_id == booking_id)
            .options(selectinload(Invoice.line_items))
            .order_by(Invoice.created_at.desc())
        )
        if not include_void:
            query = query.where(Invoice.status != "VOID")
        return self.db.scalar(query)

    def add(self, invoice: Invoice) -> Invoice:
        self.db.add(invoice)
        self.db.flush()
        return invoice

    def add_line(self, line: InvoiceLineItem) -> InvoiceLineItem:
        self.db.add(line)
        return line
