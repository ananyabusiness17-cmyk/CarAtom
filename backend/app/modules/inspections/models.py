from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.models import Base


class Inspection(Base):
    __tablename__ = "inspections"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    visit_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("visits.id"), unique=True, nullable=False
    )
    job_card_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("job_cards.id"), nullable=True
    )
    status: Mapped[str] = mapped_column(Text, nullable=False, default="draft")
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    submitted_by: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("profiles.id"), nullable=True
    )
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    findings: Mapped[list["InspectionFinding"]] = relationship(
        back_populates="inspection", cascade="all, delete-orphan"
    )


class InspectionFinding(Base):
    __tablename__ = "inspection_findings"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    inspection_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("inspections.id", ondelete="CASCADE"), nullable=False
    )
    job_card_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("job_cards.id"), nullable=True
    )
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str | None] = mapped_column(Text, nullable=True)
    customer_explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    recommendation: Mapped[str | None] = mapped_column(Text, nullable=True)
    repair_category: Mapped[str | None] = mapped_column(Text, nullable=True)
    severity: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    media_asset_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("media_assets.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    inspection: Mapped[Inspection] = relationship(back_populates="findings")
