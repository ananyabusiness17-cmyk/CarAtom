from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models import Base


class Vehicle(Base):
    __tablename__ = "vehicles"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    profile_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("profiles.id"), nullable=False
    )
    make: Mapped[str] = mapped_column(Text, nullable=False)
    model: Mapped[str] = mapped_column(Text, nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    fuel_type: Mapped[str] = mapped_column(Text, nullable=False)
    transmission: Mapped[str] = mapped_column(Text, nullable=False)
    registration_number: Mapped[str | None] = mapped_column(Text, nullable=True)
    variant: Mapped[str | None] = mapped_column(Text, nullable=True)
    mileage_km: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_archived: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class VehicleServiceLog(Base):
    __tablename__ = "vehicle_service_logs"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    vehicle_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False
    )
    visit_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("visits.id"), nullable=True
    )
    offering_slug: Mapped[str | None] = mapped_column(Text, nullable=True)
    invoice_total_minor: Mapped[int | None] = mapped_column(Integer, nullable=True)
    odometer_km: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
