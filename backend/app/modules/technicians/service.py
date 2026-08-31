from sqlalchemy.orm import Session

from app.modules.visits.repository import VisitRepository


class TechnicianService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = VisitRepository(db)

    def by_profile(self, profile_id: str):
        return self.repo.technician_by_profile(profile_id)
