from datetime import datetime
from uuid import uuid4

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Text,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models import Base

LOCATIONS = ("WH", "VAN_A", "VAN_B", "VAN_C")
MOVEMENT_TYPES = ("RECEIVE", "CONSUME", "ADJUST", "REVERSE", "TRANSFER")


class InventorySku(Base):
    __tablename__ = "inventory_skus"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    sku_code: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    oem_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    unit: Mapped[str] = mapped_column(Text, nullable=False, default="each")
    low_stock_threshold: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    extra: Mapped[dict] = mapped_column("metadata", JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class InventoryStock(Base):
    __tablename__ = "inventory_stock"
    __table_args__ = (UniqueConstraint("sku_id", "location_code"),)

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    sku_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("inventory_skus.id"), nullable=False
    )
    location_code: Mapped[str] = mapped_column(Text, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    sku_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("inventory_skus.id"), nullable=False
    )
    movement_type: Mapped[str] = mapped_column(Text, nullable=False)
    location_code: Mapped[str] = mapped_column(Text, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    to_location_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    job_card_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("job_cards.id"), nullable=True
    )
    visit_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("visits.id"), nullable=True
    )
    job_part_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("job_parts.id"), nullable=True
    )
    actor_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("profiles.id"), nullable=False
    )
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    reference: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ServiceOfferingVersion(Base):
    __tablename__ = "service_offering_versions"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    offering_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("service_offerings.id"), nullable=False
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    slug: Mapped[str] = mapped_column(Text, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    display_price_minor: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False)
    snapshot: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    actor_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("profiles.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
