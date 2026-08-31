from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, Text, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.models import Base


class Technician(Base):
    __tablename__ = "technicians"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    profile_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("profiles.id"), unique=True, nullable=False
    )
    employee_code: Mapped[str | None] = mapped_column(Text, unique=True, nullable=True)
    display_name: Mapped[str] = mapped_column(Text, nullable=False)
    on_duty: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="active")
    van_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    skills: Mapped[list["TechnicianSkill"]] = relationship(
        back_populates="technician", cascade="all, delete-orphan"
    )


class TechnicianSkill(Base):
    __tablename__ = "technician_skills"
    __table_args__ = (UniqueConstraint("technician_id", "skill_code"),)

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    technician_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), ForeignKey("technicians.id", ondelete="CASCADE"), nullable=False
    )
    skill_code: Mapped[str] = mapped_column(Text, nullable=False)

    technician: Mapped[Technician] = relationship(back_populates="skills")
