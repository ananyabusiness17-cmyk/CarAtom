from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.models import Base


class Estimate(Base):
    __tablename__ = "estimates"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    job_card_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("job_cards.id", ondelete="CASCADE"), nullable=False
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="DRAFT")
    total_minor: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(Text, nullable=False, default="INR")
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    content_hash: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(Text, nullable=False, default="system")
    parts_advance_amount_minor: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    line_items: Mapped[list["EstimateLineItem"]] = relationship(
        back_populates="estimate", cascade="all, delete-orphan"
    )


class EstimateLineItem(Base):
    __tablename__ = "estimate_line_items"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    estimate_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("estimates.id", ondelete="CASCADE"), nullable=False
    )
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    label: Mapped[str] = mapped_column(Text, nullable=False)
    kind: Mapped[str] = mapped_column(Text, nullable=False)
    amount_minor: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(Text, nullable=False, default="INR")
    is_included: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    was_amount_minor: Mapped[int | None] = mapped_column(Integer, nullable=True)
    change_type: Mapped[str | None] = mapped_column(Text, nullable=True)
    repair_offering_slug: Mapped[str | None] = mapped_column(Text, nullable=True)

    estimate: Mapped[Estimate] = relationship(back_populates="line_items")


class EstimateAcceptance(Base):
    __tablename__ = "estimate_acceptances"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    estimate_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("estimates.id"), nullable=False
    )
    job_card_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("job_cards.id"), nullable=False
    )
    profile_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("profiles.id"), nullable=True
    )
    accepted_total_minor: Mapped[int] = mapped_column(Integer, nullable=False)
    idempotency_key: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    accepted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class EstimateRejection(Base):
    __tablename__ = "estimate_rejections"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    estimate_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("estimates.id"), nullable=False
    )
    job_card_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("job_cards.id"), nullable=False
    )
    rejected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    profile_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("profiles.id"), nullable=False
    )
