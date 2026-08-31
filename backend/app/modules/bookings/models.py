from datetime import datetime
from uuid import uuid4

from sqlalchemy import JSON, DateTime, ForeignKey, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.models import Base


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    public_ref: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    job_card_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("job_cards.id"), nullable=False
    )
    profile_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("profiles.id"), nullable=False
    )
    status: Mapped[str] = mapped_column(Text, nullable=False, default="CONFIRMED")
    slot_starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    slot_ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    timezone: Mapped[str] = mapped_column(Text, nullable=False, default="Asia/Kolkata")
    visit_type: Mapped[str] = mapped_column(Text, nullable=False, default="SERVICE")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    snapshot: Mapped["BookingSnapshot | None"] = relationship(
        back_populates="booking", uselist=False, cascade="all, delete-orphan"
    )


class BookingSnapshot(Base):
    __tablename__ = "booking_snapshots"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    booking_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("bookings.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    customer_snapshot: Mapped[dict] = mapped_column(JSON, nullable=False)
    address_snapshot: Mapped[dict] = mapped_column(JSON, nullable=False)
    vehicle_snapshot: Mapped[dict] = mapped_column(JSON, nullable=False)
    estimate_snapshot: Mapped[dict] = mapped_column(JSON, nullable=False)
    offering_snapshot: Mapped[dict] = mapped_column(JSON, nullable=False)
    flow_policy: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    booking: Mapped[Booking] = relationship(back_populates="snapshot")
