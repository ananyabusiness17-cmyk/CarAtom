from datetime import datetime
from uuid import uuid4

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.models import Base


class JobCard(Base):
    __tablename__ = "job_cards"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    public_ref: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    profile_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("profiles.id"), nullable=True
    )
    service_offering_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("service_offerings.id"), nullable=False
    )
    flow_policy: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="EDITABLE")
    vehicle_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("vehicles.id"), nullable=True
    )
    address_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("addresses.id"), nullable=True
    )
    vehicle_context: Mapped[dict] = mapped_column(JSON, nullable=False)
    service_area_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("service_area_rules.id"), nullable=True
    )
    accepted_estimate_id: Mapped[str | None] = mapped_column(Uuid(as_uuid=False), nullable=True)
    inspection_visit_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("visits.id"), nullable=True
    )
    repair_visit_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("visits.id"), nullable=True
    )
    accepted_inspection_estimate_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("estimates.id"), nullable=True
    )
    idempotency_namespace: Mapped[str | None] = mapped_column(Text, nullable=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    concerns: Mapped[list["JobCardConcern"]] = relationship(
        back_populates="job_card", cascade="all, delete-orphan"
    )
    items: Mapped[list["JobCardItem"]] = relationship(
        back_populates="job_card", cascade="all, delete-orphan"
    )
    events: Mapped[list["JobCardEvent"]] = relationship(
        back_populates="job_card", cascade="all, delete-orphan"
    )


class JobCardConcern(Base):
    __tablename__ = "job_card_concerns"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    job_card_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("job_cards.id", ondelete="CASCADE"), nullable=False
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    job_card: Mapped[JobCard] = relationship(back_populates="concerns")


class JobCardItem(Base):
    __tablename__ = "job_card_items"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    job_card_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("job_cards.id", ondelete="CASCADE"), nullable=False
    )
    kind: Mapped[str] = mapped_column(Text, nullable=False)
    service_offering_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("service_offerings.id"), nullable=True
    )
    repair_offering_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("repair_offerings.id"), nullable=True
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    label_snapshot: Mapped[str] = mapped_column(Text, nullable=False)
    unit_price_minor: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(Text, nullable=False, default="INR")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    job_card: Mapped[JobCard] = relationship(back_populates="items")


class JobCardEvent(Base):
    __tablename__ = "job_card_events"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    job_card_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("job_cards.id", ondelete="CASCADE"), nullable=False
    )
    event_type: Mapped[str] = mapped_column(Text, nullable=False)
    actor_profile_id: Mapped[str | None] = mapped_column(Uuid(as_uuid=False), nullable=True)
    request_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    job_card: Mapped[JobCard] = relationship(back_populates="events")
