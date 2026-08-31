from datetime import datetime
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, Numeric, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.models import Base


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    booking_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("bookings.id"), nullable=False
    )
    invoice_number: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="DRAFT")
    currency: Mapped[str] = mapped_column(Text, nullable=False, default="INR")
    subtotal_minor: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    tax_minor: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_minor: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    paid_minor: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    balance_minor: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    issued_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    pdf_storage_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    line_items: Mapped[list["InvoiceLineItem"]] = relationship(
        back_populates="invoice",
        cascade="all, delete-orphan",
        order_by="InvoiceLineItem.sort_order",
    )


class InvoiceLineItem(Base):
    __tablename__ = "invoice_line_items"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    invoice_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False
    )
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    kind: Mapped[str] = mapped_column(Text, nullable=False)
    label: Mapped[str] = mapped_column(Text, nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=Decimal("1"))
    unit_price_minor: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    amount_minor: Mapped[int] = mapped_column(Integer, nullable=False)
    extra: Mapped[dict | None] = mapped_column("metadata", JSON, nullable=True)

    invoice: Mapped[Invoice] = relationship(back_populates="line_items")
