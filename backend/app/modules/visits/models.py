from datetime import datetime
from uuid import uuid4

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.models import Base


class Visit(Base):
    __tablename__ = "visits"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    public_ref: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    booking_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("bookings.id"), nullable=False
    )
    job_card_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("job_cards.id"), nullable=False
    )
    visit_type: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="SCHEDULED")
    scheduled_start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    scheduled_end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    timezone: Mapped[str] = mapped_column(Text, nullable=False, default="Asia/Kolkata")
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    scope_lines: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    advisor_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    parking_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    distance_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    display_type_label: Mapped[str | None] = mapped_column(Text, nullable=True)
    actual_start_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    actual_finish_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    assignments: Mapped[list["TechnicianAssignment"]] = relationship(
        back_populates="visit", cascade="all, delete-orphan"
    )


class TechnicianAssignment(Base):
    __tablename__ = "technician_assignments"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    visit_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("visits.id", ondelete="CASCADE"), nullable=False
    )
    technician_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("technicians.id"), nullable=False
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    unassigned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_current: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    visit: Mapped[Visit] = relationship(back_populates="assignments")


class TechnicianLocationPing(Base):
    __tablename__ = "technician_location_pings"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    technician_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("technicians.id"), nullable=False
    )
    visit_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("visits.id"), nullable=True
    )
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    accuracy_m: Mapped[float | None] = mapped_column(Float, nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    client_event_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False), unique=True, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
