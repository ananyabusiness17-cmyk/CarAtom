from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common.errors import DomainProblem
from app.modules.estimates.models import Estimate
from app.modules.field_work.models import JobPart
from app.modules.job_cards.models import JobCard
from app.modules.payments.models import PartsAdvanceAllocation
from app.modules.visits.models import Visit


def _aware(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


class InspectionRepairService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def parts_all_ready(self, job_card_id: str) -> bool:
        parts = list(
            self.db.scalars(select(JobPart).where(JobPart.job_card_id == job_card_id)).all()
        )
        recommended = [p for p in parts if p.readiness_status not in {"CANCELLED", "FITTED"}]
        if not recommended:
            return True
        return all(p.readiness_status == "READY" for p in recommended)

    def advance_captured(self, job_card_id: str, estimate_id: str | None) -> bool:
        if not estimate_id:
            return False
        row = self.db.scalar(
            select(PartsAdvanceAllocation).where(
                PartsAdvanceAllocation.job_card_id == job_card_id,
                PartsAdvanceAllocation.estimate_id == estimate_id,
            )
        )
        return row is not None and row.status == "CAPTURED"

    def can_book_repair_visit(self, job_card: JobCard) -> tuple[bool, str]:
        if job_card.flow_policy != "INSPECTION_REPAIR":
            return False, "VISIT_TYPE_MISMATCH"
        if job_card.status not in {
            "REPAIR_BOOKING_REQUIRED",
            "PARTS_PENDING",
            "PARTS_ADVANCE_DUE",
        }:
            return False, "INVALID_STATE_TRANSITION"
        estimate_id = job_card.accepted_inspection_estimate_id or job_card.accepted_estimate_id
        if not estimate_id:
            return False, "INVALID_STATE_TRANSITION"
        estimate = self.db.get(Estimate, estimate_id)
        if estimate is None or estimate.status != "ACCEPTED":
            return False, "INVALID_STATE_TRANSITION"
        expires = _aware(estimate.expires_at)
        if expires is not None and expires < datetime.now(UTC):
            return False, "ESTIMATE_EXPIRED"
        advance_due = int(estimate.parts_advance_amount_minor or 0) > 0
        if advance_due and not self.advance_captured(job_card.id, estimate.id):
            return False, "PARTS_ADVANCE_REQUIRED"
        if not self.parts_all_ready(job_card.id):
            return False, "PARTS_NOT_READY"
        overlapping = self.db.scalar(
            select(Visit).where(
                Visit.job_card_id == job_card.id,
                Visit.visit_type == "REPAIR",
                Visit.status.in_(
                    {
                        "SCHEDULED",
                        "ASSIGNED",
                        "EN_ROUTE",
                        "ON_SITE",
                        "SERVICE_IN_PROGRESS",
                        "QC_PENDING",
                    }
                ),
            )
        )
        if overlapping is not None:
            return False, "TWO_VISIT_POLICY_VIOLATION"
        return True, "OK"

    def transition_on_estimate_accept(self, job_card: JobCard, estimate: Estimate) -> str:
        advance = int(estimate.parts_advance_amount_minor or 0)
        if advance > 0:
            return "PARTS_ADVANCE_DUE"
        if not self.parts_all_ready(job_card.id):
            return "PARTS_PENDING"
        return "REPAIR_BOOKING_REQUIRED"

    def transition_on_parts_advance_captured(self, job_card: JobCard) -> str:
        if self.parts_all_ready(job_card.id):
            return "REPAIR_BOOKING_REQUIRED"
        return "PARTS_PENDING"

    def transition_on_parts_ready(self, job_card: JobCard) -> str:
        estimate_id = job_card.accepted_inspection_estimate_id or job_card.accepted_estimate_id
        estimate = self.db.get(Estimate, estimate_id) if estimate_id else None
        advance = int(estimate.parts_advance_amount_minor or 0) if estimate else 0
        if advance > 0 and not self.advance_captured(job_card.id, estimate_id):
            raise DomainProblem(
                409,
                "PARTS_ADVANCE_REQUIRED",
                "Parts advance must be captured before booking repair.",
                allowed_actions=["PAY_PARTS_ADVANCE"],
            )
        return "REPAIR_BOOKING_REQUIRED"
