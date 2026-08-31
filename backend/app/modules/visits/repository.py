from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.modules.technicians.models import Technician
from app.modules.visits.models import TechnicianAssignment, TechnicianLocationPing, Visit


class VisitRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_visit(self, visit_id: str) -> Visit | None:
        return self.db.scalar(
            select(Visit).where(Visit.id == visit_id).options(selectinload(Visit.assignments))
        )

    def get_current_assignment(self, visit_id: str) -> TechnicianAssignment | None:
        return self.db.scalar(
            select(TechnicianAssignment).where(
                TechnicianAssignment.visit_id == visit_id,
                TechnicianAssignment.is_current.is_(True),
            )
        )

    def list_for_technician(
        self, technician_id: str, start: datetime, end: datetime
    ) -> list[Visit]:
        assignment_ids = select(TechnicianAssignment.visit_id).where(
            TechnicianAssignment.technician_id == technician_id,
            TechnicianAssignment.is_current.is_(True),
        )
        return list(
            self.db.scalars(
                select(Visit)
                .where(Visit.id.in_(assignment_ids))
                .where(Visit.scheduled_start_at >= start, Visit.scheduled_start_at < end)
                .order_by(Visit.scheduled_start_at.asc())
                .options(selectinload(Visit.assignments))
            ).all()
        )

    def overlapping(
        self,
        technician_id: str,
        start: datetime,
        end: datetime,
        *,
        exclude_visit_id: str | None = None,
    ) -> list[Visit]:
        assignment_ids = select(TechnicianAssignment.visit_id).where(
            TechnicianAssignment.technician_id == technician_id,
            TechnicianAssignment.is_current.is_(True),
        )
        query = (
            select(Visit)
            .where(Visit.id.in_(assignment_ids))
            .where(Visit.status.notin_(("COMPLETED", "CANCELLED")))
            .where(Visit.scheduled_start_at < end, Visit.scheduled_end_at > start)
        )
        if exclude_visit_id:
            query = query.where(Visit.id != exclude_visit_id)
        return list(self.db.scalars(query).all())

    def technician_by_profile(self, profile_id: str) -> Technician | None:
        return self.db.scalar(
            select(Technician)
            .where(Technician.profile_id == profile_id)
            .options(selectinload(Technician.skills))
        )

    def technician_by_id(self, technician_id: str) -> Technician | None:
        return self.db.scalar(
            select(Technician)
            .where(Technician.id == technician_id)
            .options(selectinload(Technician.skills))
        )

    def last_ping_at(self, technician_id: str) -> datetime | None:
        row = self.db.scalar(
            select(TechnicianLocationPing.recorded_at)
            .where(TechnicianLocationPing.technician_id == technician_id)
            .order_by(TechnicianLocationPing.recorded_at.desc())
            .limit(1)
        )
        return row

    def skill_codes(self, technician: Technician) -> list[str]:
        return [row.skill_code for row in technician.skills]
