from datetime import datetime
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, Numeric, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models import Base


class JobPart(Base):
    __tablename__ = "job_parts"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    visit_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("visits.id"), nullable=False
    )
    job_card_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("job_cards.id"), nullable=False
    )
    sku_code: Mapped[str] = mapped_column(Text, nullable=False)
    label: Mapped[str] = mapped_column(Text, nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    readiness_status: Mapped[str] = mapped_column(Text, nullable=False, default="FITTED")
    ordered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ready_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    fitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    client_event_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False), unique=True, nullable=True
    )
    intent: Mapped[str] = mapped_column(Text, nullable=False, default="FIT")
    inventory_movement_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("inventory_movements.id", use_alter=True, name="fk_job_parts_movement"),
        nullable=True,
    )


class JobLabour(Base):
    __tablename__ = "job_labour"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    visit_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("visits.id"), nullable=False
    )
    job_card_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("job_cards.id"), nullable=False
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    client_event_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False), unique=True, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class QcCheck(Base):
    __tablename__ = "qc_checks"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    visit_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("visits.id"), nullable=False
    )
    checklist_version: Mapped[str] = mapped_column(Text, nullable=False, default="v1")
    items: Mapped[list] = mapped_column(JSON, nullable=False)
    passed: Mapped[bool] = mapped_column(Boolean, nullable=False)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    client_event_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False), unique=True, nullable=True
    )
