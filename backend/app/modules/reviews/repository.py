from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.reviews.models import Review


class ReviewRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_for_booking(self, booking_id: str) -> Review | None:
        return self.db.scalar(select(Review).where(Review.booking_id == booking_id))

    def add(self, review: Review) -> Review:
        self.db.add(review)
        self.db.flush()
        return review
