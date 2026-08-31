from uuid import uuid4

from sqlalchemy.orm import Session

from app.modules.estimates.models import Estimate
from app.modules.estimates.repository import EstimateRepository
from app.modules.job_cards import state_machine
from app.modules.job_cards.models import JobCard


def is_one_man(job_card: JobCard) -> bool:
    return job_card.flow_policy == "ONE_MAN"


def auto_accept_estimate(db: Session, job_card: JobCard, estimate: Estimate) -> None:
    """Catalog-fixed ONE_MAN price: accept immediately, skip client ACCEPT_ESTIMATE."""
    repo = EstimateRepository(db)
    repo.add_acceptance(
        estimate.id,
        job_card.id,
        job_card.profile_id,
        estimate.total_minor,
        f"auto-catalog-{job_card.id}-{estimate.id}-{uuid4().hex[:8]}",
    )
    estimate.status = "ACCEPTED"
    if job_card.status == "ESTIMATE_READY":
        state_machine.transition(job_card, "ESTIMATE_ACCEPTED")
    if job_card.status == "ESTIMATE_ACCEPTED":
        state_machine.transition(job_card, "READY_FOR_FINALIZATION")
    job_card.accepted_estimate_id = estimate.id
