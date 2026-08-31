from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.models import Base


class AdvisorCase(Base):
    __tablename__ = "advisor_cases"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    job_card_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("job_cards.id", ondelete="RESTRICT"),
        unique=True,
        nullable=False,
    )
    status: Mapped[str] = mapped_column(Text, nullable=False, default="OPEN")
    assigned_admin_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("profiles.id"), nullable=True
    )
    verified_phone_e164: Mapped[str | None] = mapped_column(Text, nullable=True)
    attempt_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    next_attempt_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_contact_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    customer_response: Mapped[str | None] = mapped_column(Text, nullable=True)
    confirmed_estimate_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("estimates.id"), nullable=True
    )
    pending_estimate_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("estimates.id"), nullable=True
    )
    resolution_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    call_attempts: Mapped[list["AdvisorCallAttempt"]] = relationship(
        back_populates="advisor_case", cascade="all, delete-orphan"
    )
    notes: Mapped[list["AdvisorNote"]] = relationship(
        back_populates="advisor_case", cascade="all, delete-orphan"
    )


class AdvisorCallAttempt(Base):
    __tablename__ = "advisor_call_attempts"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    advisor_case_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("advisor_cases.id", ondelete="CASCADE"), nullable=False
    )
    channel: Mapped[str] = mapped_column(Text, nullable=False, default="phone")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    outcome: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    actor_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("profiles.id"), nullable=True
    )
    callback_requested: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    advisor_case: Mapped[AdvisorCase] = relationship(back_populates="call_attempts")


class AdvisorNote(Base):
    __tablename__ = "advisor_notes"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    advisor_case_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("advisor_cases.id", ondelete="CASCADE"), nullable=False
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    author_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("profiles.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    is_internal: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    advisor_case: Mapped[AdvisorCase] = relationship(back_populates="notes")
