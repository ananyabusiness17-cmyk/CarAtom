from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models import Base


class CatalogKitLine(Base):
    __tablename__ = "catalog_kit_lines"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    owner_type: Mapped[str] = mapped_column(Text, nullable=False)
    owner_id: Mapped[str] = mapped_column(Uuid(as_uuid=False), nullable=False)
    sku_id: Mapped[str | None] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("inventory_skus.id"), nullable=True
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    line_kind: Mapped[str] = mapped_column(Text, nullable=False, default="PART")
    label: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
