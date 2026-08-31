from datetime import datetime
from uuid import uuid4

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models import Base


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    job_card_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("job_cards.id"), nullable=False
    )
    estimate_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("estimates.id"), nullable=True
    )
    invoice_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("invoices.id"), nullable=True
    )
    purpose: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="CREATED")
    amount_minor: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(Text, nullable=False, default="INR")
    provider: Mapped[str] = mapped_column(Text, nullable=False, default="RAZORPAY")
    razorpay_order_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    razorpay_payment_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    idempotency_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    captured_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    provider_payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PaymentEvent(Base):
    __tablename__ = "payment_events"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    payment_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("payments.id", ondelete="CASCADE"), nullable=True
    )
    event_type: Mapped[str] = mapped_column(Text, nullable=False)
    provider_event_id: Mapped[str | None] = mapped_column(Text, unique=True, nullable=True)
    payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    signature_valid: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    processing_result: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PartsAdvanceAllocation(Base):
    __tablename__ = "parts_advance_allocations"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    job_card_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("job_cards.id"), nullable=False
    )
    estimate_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("estimates.id"), nullable=False
    )
    payment_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("payments.id"), nullable=True
    )
    amount_minor: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(Text, nullable=False, default="INR")
    status: Mapped[str] = mapped_column(Text, nullable=False, default="DUE")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Refund(Base):
    __tablename__ = "refunds"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    payment_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("payments.id"), nullable=False
    )
    amount_minor: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="REQUESTED")
    provider_refund_id: Mapped[str | None] = mapped_column(Text, unique=True, nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
