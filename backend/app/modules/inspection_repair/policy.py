"""Parts-advance percent and inspection fee policy."""

from sqlalchemy.orm import Session

from app.db.models import PricingPolicy, ServiceOffering
from app.modules.job_cards.models import JobCard

DEFAULT_ADVANCE_PERCENT = 60
DEFAULT_INSPECTION_FEE_MINOR = 49900


def parts_advance_amount(parts_subtotal_minor: int, percent: int) -> int:
    if parts_subtotal_minor <= 0 or percent <= 0:
        return 0
    return (parts_subtotal_minor * percent) // 100


def policy_for_job(db: Session, job_card: JobCard) -> tuple[int, int]:
    offering = db.get(ServiceOffering, job_card.service_offering_id)
    percent = DEFAULT_ADVANCE_PERCENT
    fee = DEFAULT_INSPECTION_FEE_MINOR
    if offering and offering.pricing_policy_id:
        row = db.get(PricingPolicy, offering.pricing_policy_id)
        if row is not None:
            percent = int(getattr(row, "parts_advance_percent", DEFAULT_ADVANCE_PERCENT) or 60)
            fee = int(getattr(row, "inspection_fee_minor", DEFAULT_INSPECTION_FEE_MINOR) or 0)
    return percent, fee
