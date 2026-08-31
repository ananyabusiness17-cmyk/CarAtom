from datetime import datetime
from uuid import uuid4

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text, Uuid, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True)
    phone: Mapped[str | None] = mapped_column(Text, nullable=True)
    full_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    role: Mapped[str] = mapped_column(Text, nullable=False, default="customer")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class ServiceCategory(Base):
    __tablename__ = "service_categories"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    slug: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    offerings: Mapped[list["ServiceOffering"]] = relationship(back_populates="category")


class PricingPolicy(Base):
    __tablename__ = "pricing_policies"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    slug: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    base_price_minor: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="INR")
    tax_rate_bps: Mapped[int] = mapped_column(Integer, nullable=False, default=1800)
    valid_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    valid_to: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    parts_advance_percent: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    inspection_fee_minor: Mapped[int] = mapped_column(Integer, nullable=False, default=49900)


class ServiceOffering(Base):
    __tablename__ = "service_offerings"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    slug: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    category_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("service_categories.id")
    )
    pricing_policy_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("pricing_policies.id")
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    short_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    flow_policy: Mapped[str] = mapped_column(Text, nullable=False)
    display_price_minor: Mapped[int | None] = mapped_column(Integer, nullable=True)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="INR")
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    hero_media_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    icon_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    disclosures: Mapped[list | None] = mapped_column(JSON, nullable=True)
    media: Mapped[list | None] = mapped_column(JSON, nullable=True)
    dev_fixture: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    category: Mapped[ServiceCategory | None] = relationship(back_populates="offerings")
    included_items: Mapped[list["IncludedServiceItem"]] = relationship(back_populates="offering")


class IncludedServiceItem(Base):
    __tablename__ = "included_service_items"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    offering_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("service_offerings.id", ondelete="CASCADE"), nullable=False
    )
    label: Mapped[str] = mapped_column(Text, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    offering: Mapped[ServiceOffering] = relationship(back_populates="included_items")


class ServiceAreaRule(Base):
    __tablename__ = "service_area_rules"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    slug: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    city: Mapped[str] = mapped_column(Text, nullable=False)
    locality: Mapped[str | None] = mapped_column(Text, nullable=True)
    postal_prefixes: Mapped[list | None] = mapped_column(JSON, nullable=True)
    geo_bbox: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    launch_phase: Mapped[str | None] = mapped_column(Text, default="koramangala-mvp")


class CmsBlock(Base):
    __tablename__ = "cms_blocks"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    block_key: Mapped[str] = mapped_column(Text, nullable=False)
    locale: Mapped[str] = mapped_column(Text, nullable=False, default="en-IN")
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class FeatureSetting(Base):
    __tablename__ = "feature_settings"

    key: Mapped[str] = mapped_column(Text, primary_key=True)
    value: Mapped[dict] = mapped_column(JSON, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class RepairCategory(Base):
    __tablename__ = "repair_categories"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    slug: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    offerings: Mapped[list["RepairOffering"]] = relationship(back_populates="category")


class RepairOffering(Base):
    __tablename__ = "repair_offerings"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    slug: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    category_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("repair_categories.id"), nullable=True
    )
    display_price_minor: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="INR")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    icon_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    dev_fixture: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    category: Mapped[RepairCategory | None] = relationship(back_populates="offerings")


class IdempotencyKey(Base):
    __tablename__ = "idempotency_keys"

    key: Mapped[str] = mapped_column(Text, primary_key=True)
    profile_id: Mapped[str | None] = mapped_column(Uuid(as_uuid=False), nullable=True)
    route: Mapped[str] = mapped_column(Text, nullable=False)
    response_status: Mapped[int] = mapped_column(Integer, nullable=False)
    response_body: Mapped[dict] = mapped_column(JSON, nullable=False)
    request_hash: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class IdSequence(Base):
    __tablename__ = "id_sequences"

    name: Mapped[str] = mapped_column(Text, primary_key=True)
    value: Mapped[int] = mapped_column(Integer, nullable=False)


def import_phase03_models() -> None:
    import sys

    # Skip a module that is already in sys.modules: it is fully loaded, or it is
    # the caller of this function (circular: invoices.models → Base → here).
    modules = (
        "app.modules.addresses.models",
        "app.modules.advisor.models",
        "app.modules.audit.models",
        "app.modules.bookings.models",
        "app.modules.catalog.kit_models",
        "app.modules.estimates.models",
        "app.modules.field_work.models",
        "app.modules.inspections.models",
        "app.modules.inventory.models",
        "app.modules.invoices.models",
        "app.modules.job_cards.models",
        "app.modules.notifications.models",
        "app.modules.payments.models",
        "app.modules.reviews.models",
        "app.modules.slots.models",
        "app.modules.support.models",
        "app.modules.technicians.models",
        "app.modules.vehicles.models",
        "app.modules.visits.models",
    )
    for name in modules:
        if name in sys.modules:
            continue
        __import__(name)


import_phase03_models()
