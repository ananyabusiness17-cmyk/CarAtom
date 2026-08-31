from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common.errors import DomainProblem
from app.core.deps import CurrentUser
from app.modules.bookings.models import Booking
from app.modules.bookings.progress_composer import compose_customer_progress
from app.modules.invoices.repository import InvoiceRepository
from app.modules.job_cards.models import JobCard
from app.modules.payments.models import Payment
from app.modules.reviews.models import Review
from app.modules.reviews.repository import ReviewRepository
from app.modules.reviews.schemas import ReviewCreateRequest, ReviewOut
from app.modules.visits.models import Visit


class ReviewService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = ReviewRepository(db)

    def submit(self, body: ReviewCreateRequest, user: CurrentUser) -> tuple[ReviewOut, bool]:
        existing = self.repo.get_for_booking(body.booking_id)
        if existing is not None:
            if existing.profile_id != user.id and user.role != "admin":
                raise DomainProblem(404, "NOT_FOUND", "Not found.")
            raise DomainProblem(
                409,
                "REVIEW_ALREADY_SUBMITTED",
                "A review has already been submitted for this booking.",
            )
        booking = self.db.get(Booking, body.booking_id)
        if booking is None or (booking.profile_id != user.id and user.role != "admin"):
            raise DomainProblem(404, "NOT_FOUND", "Not found.")
        if not self._reviewable(booking):
            raise DomainProblem(
                409,
                "BOOKING_NOT_REVIEWABLE",
                "This booking is not ready for a review yet.",
            )
        review = Review(
            booking_id=booking.id,
            profile_id=user.id,
            rating=body.rating,
            comment=body.comment,
            submitted_at=datetime.now(UTC),
        )
        self.repo.add(review)
        return self.to_out(review), True

    def to_out(self, review: Review) -> ReviewOut:
        submitted = review.submitted_at
        if submitted.tzinfo is None:
            submitted = submitted.replace(tzinfo=UTC)
        return ReviewOut(
            id=review.id,
            booking_id=review.booking_id,
            rating=review.rating,
            comment=review.comment,
            submitted_at=submitted.isoformat(),
        )

    def _reviewable(self, booking: Booking) -> bool:
        visits = list(
            self.db.scalars(select(Visit).where(Visit.job_card_id == booking.job_card_id)).all()
        )
        invoice = InvoiceRepository(self.db).get_by_booking(booking.id)
        payments = list(
            self.db.scalars(select(Payment).where(Payment.job_card_id == booking.job_card_id)).all()
        )
        job = self.db.get(JobCard, booking.job_card_id)
        progress = compose_customer_progress(
            booking_status=booking.status,
            job_status=job.status if job else None,
            flow_policy=job.flow_policy if job else None,
            visit_states=[visit.status for visit in visits],
            invoice_status=invoice.status if invoice else None,
            invoice_balance_minor=invoice.balance_minor if invoice else 0,
            payment_statuses=[row.status for row in payments],
            review_submitted=False,
        )
        return progress.key in {"COMPLETED", "PAID"} or (
            invoice is not None and invoice.status == "PAID"
        )
