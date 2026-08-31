from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, Float, ForeignKey, Integer, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models import Base

ACTIVE_ROADSIDE = ("CREATED", "OPS_NOTIFIED", "DISPATCHED_STUB")
CANCELLABLE = ("CREATED", "OPS_NOTIFIED")


class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    profile_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("profiles.id", ondelete="RESTRICT"), nullable=False
    )
    ticket_type: Mapped[str] = mapped_column(Text, nullable=False, default="ROADSIDE")
    status: Mapped[str] = mapped_column(Text, nullable=False, default="CREATED")
    priority: Mapped[str] = mapped_column(Text, nullable=False, default="EMERGENCY")
    issue_code: Mapped[str] = mapped_column(Text, nullable=False)
    issue_label: Mapped[str] = mapped_column(Text, nullable=False)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    location_label: Mapped[str | None] = mapped_column(Text, nullable=True)
    booking_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("bookings.id", ondelete="SET NULL"), nullable=True
    )
    public_ref: Mapped[str | None] = mapped_column(Text, unique=True, nullable=True)
    ops_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    dispatched_partner_label: Mapped[str | None] = mapped_column(Text, nullable=True)
    eta_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
