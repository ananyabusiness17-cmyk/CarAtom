from datetime import date, datetime, time
from uuid import uuid4

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Text, Time, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models import Base


class ServiceCalendar(Base):
    __tablename__ = "service_calendars"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    slug: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    timezone: Mapped[str] = mapped_column(Text, nullable=False, default="Asia/Kolkata")
    operating_start: Mapped[time] = mapped_column(Time, nullable=False, default=time(9, 0))
    operating_end: Mapped[time] = mapped_column(Time, nullable=False, default=time(18, 0))
    slot_capacity: Mapped[int] = mapped_column(Integer, nullable=False, default=3)


class Holiday(Base):
    __tablename__ = "holidays"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    calendar_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("service_calendars.id"), nullable=False
    )
    holiday_date: Mapped[date] = mapped_column(Date, nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)


class SlotHold(Base):
    __tablename__ = "slot_holds"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    job_card_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("job_cards.id"), nullable=False
    )
    profile_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("profiles.id"), nullable=False
    )
    slot_starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    slot_ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    timezone: Mapped[str] = mapped_column(Text, nullable=False, default="Asia/Kolkata")
    status: Mapped[str] = mapped_column(Text, nullable=False, default="ACTIVE")
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    idempotency_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
