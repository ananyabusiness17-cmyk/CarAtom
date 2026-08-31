from datetime import time
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.modules.slots.models import ServiceCalendar


def seed_scheduling(db: Session) -> None:
    calendar = db.scalar(
        select(ServiceCalendar).where(ServiceCalendar.slug == "koramangala-default")
    )
    if calendar is None:
        db.add(
            ServiceCalendar(
                id=str(uuid4()),
                slug="koramangala-default",
                timezone="Asia/Kolkata",
                operating_start=time(9, 0),
                operating_end=time(18, 0),
                slot_capacity=settings.slot_capacity,
            )
        )
        db.commit()
        return
    calendar.slot_capacity = settings.slot_capacity
    db.commit()
