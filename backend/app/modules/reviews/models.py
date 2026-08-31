from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, SmallInteger, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models import Base


class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    booking_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("bookings.id"), unique=True, nullable=False
    )
    profile_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("profiles.id"), nullable=False
    )
    rating: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
