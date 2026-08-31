import json
from datetime import UTC, datetime, timedelta
from hashlib import sha256

from sqlalchemy.orm import Session

from app.common.errors import DomainProblem
from app.db.models import PricingPolicy, RepairOffering, ServiceOffering
from app.modules.estimates.models import Estimate
from app.modules.estimates.repository import EstimateRepository
from app.modules.job_cards.models import JobCard

ESTIMATE_TTL = timedelta(hours=24)


def content_hash(lines: list[dict]) -> str:
    payload = json.dumps(lines, sort_keys=True, separators=(",", ":"))
    return "sha256:" + sha256(payload.encode("utf-8")).hexdigest()


class PricingService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.estimates = EstimateRepository(db)

    def build_estimate(self, job_card: JobCard) -> Estimate:
        offering = self.db.get(ServiceOffering, job_card.service_offering_id)
        if offering is None or not offering.is_active:
            raise DomainProblem(422, "INVALID_OFFERING_FOR_FLOW", "Offering is not available.")
        amount = offering.display_price_minor
        if offering.pricing_policy_id:
            policy = self.db.get(PricingPolicy, offering.pricing_policy_id)
            if policy is not None and policy.is_active:
                amount = policy.base_price_minor
        if amount is None:
            raise DomainProblem(422, "INVALID_OFFERING_FOR_FLOW", "Offering has no price.")

        lines = [
            {
                "label": offering.name,
                "kind": "SERVICE",
                "amount_minor": amount,
                "is_included": False,
            }
        ]
        total = amount
        for item in job_card.items:
            if item.kind != "REPAIR":
                continue
            slug = None
            if item.repair_offering_id:
                repair = self.db.get(RepairOffering, item.repair_offering_id)
                slug = repair.slug if repair is not None else None
            lines.append(
                {
                    "label": item.label_snapshot,
                    "kind": "REPAIR",
                    "amount_minor": item.unit_price_minor * item.quantity,
                    "is_included": False,
                    "repair_offering_slug": slug,
                }
            )
            total += item.unit_price_minor * item.quantity
        lines.append(
            {
                "label": "Included fluids check",
                "kind": "INCLUSION",
                "amount_minor": 0,
                "is_included": True,
            },
        )
        self.estimates.supersede_ready(job_card.id)
        estimate = Estimate(
            job_card_id=job_card.id,
            version=self.estimates.next_version(job_card.id),
            status="READY",
            total_minor=total,
            currency="INR",
            expires_at=datetime.now(UTC) + ESTIMATE_TTL,
            content_hash=content_hash(lines),
        )
        self.db.add(estimate)
        self.db.flush()
        for index, line in enumerate(lines):
            self.estimates.add_line(
                estimate.id,
                sort_order=index,
                label=line["label"],
                kind=line["kind"],
                amount_minor=line["amount_minor"],
                is_included=line["is_included"],
                repair_offering_slug=line.get("repair_offering_slug"),
            )
        self.db.flush()
        loaded = self.estimates.get(estimate.id)
        assert loaded is not None
        if job_card.profile_id:
            from app.modules.notifications.service import enqueue_intent

            enqueue_intent(
                self.db,
                profile_id=job_card.profile_id,
                intent="estimate_ready",
                entity_type="estimate",
                entity_id=loaded.id,
                context={
                    "service_name": offering.name,
                    "estimate_id": loaded.id,
                    "job_card_id": job_card.id,
                },
            )
        return loaded
