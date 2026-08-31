from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common.errors import DomainProblem
from app.db.models import FeatureSetting
from app.modules.estimates.models import Estimate
from app.modules.estimates.repository import EstimateRepository
from app.modules.field_work.models import JobLabour, JobPart
from app.modules.inspection_repair.policy import parts_advance_amount, policy_for_job
from app.modules.inspections.models import Inspection, InspectionFinding
from app.modules.job_cards import state_machine
from app.modules.job_cards.models import JobCard
from app.modules.job_cards.repository import JobCardRepository
from app.modules.media.models import MediaAsset
from app.modules.notifications.models import OutboxEvent
from app.modules.pricing.service import content_hash
from app.modules.visits.models import Visit

IR_PART_PRICES = {
    "front-brake-pad-set": ("Front brake pads", 320000),
    "front-brake-rotors-pair": ("Front brake rotors (pair)", 480000),
}

IR_LABOUR_PRICES = {
    "brake service labour": 400000,
}

ESTIMATE_TTL = timedelta(days=14)


def _auto_publish_enabled(db: Session) -> bool:
    setting = db.get(FeatureSetting, "auto_publish_inspection_estimate")
    if setting is None:
        return True
    value = setting.value
    if isinstance(value, dict):
        return bool(value.get("enabled", True))
    return bool(value)


def _sell_price_for_part(sku: str, label: str) -> tuple[str, int]:
    if sku in IR_PART_PRICES:
        return IR_PART_PRICES[sku]
    for key, (name, amount) in IR_PART_PRICES.items():
        if key in sku or sku in key:
            return name, amount
    return label, 0


def _sell_price_for_labour(description: str) -> int:
    key = description.strip().lower()
    if key in IR_LABOUR_PRICES:
        return IR_LABOUR_PRICES[key]
    for name, amount in IR_LABOUR_PRICES.items():
        if name in key:
            return amount
    return 400000


class InspectionService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.estimates = EstimateRepository(db)
        self.job_cards = JobCardRepository(db)

    def publish_estimate_from_findings(
        self, job_card: JobCard, *, actor_id: str | None
    ) -> Estimate:
        inspection = self.db.scalar(
            select(Inspection)
            .where(Inspection.job_card_id == job_card.id)
            .order_by(Inspection.submitted_at.desc())
        )
        if inspection is None:
            inspection = self.db.scalar(
                select(Inspection)
                .join(Visit, Visit.id == Inspection.visit_id)
                .where(Visit.job_card_id == job_card.id)
            )
        if inspection is None or inspection.status not in {"submitted", "SUBMITTED"}:
            raise DomainProblem(
                409,
                "INSPECTION_NOT_SUBMITTED",
                "Findings must be submitted before publishing an estimate.",
                allowed_actions=["VIEW_BOOKING"],
            )
        percent, fee = policy_for_job(self.db, job_card)
        parts = list(
            self.db.scalars(
                select(JobPart).where(
                    JobPart.job_card_id == job_card.id,
                    JobPart.readiness_status == "RECOMMENDED",
                )
            ).all()
        )
        labour = list(
            self.db.scalars(select(JobLabour).where(JobLabour.job_card_id == job_card.id)).all()
        )
        lines: list[dict] = []
        if fee > 0:
            lines.append(
                {
                    "label": "Inspection visit",
                    "kind": "FEE",
                    "amount_minor": fee,
                    "is_included": False,
                }
            )
        parts_subtotal = 0
        for part in parts:
            label, amount = _sell_price_for_part(part.sku_code, part.label)
            qty = int(part.quantity or 1)
            amount = amount * max(qty, 1)
            parts_subtotal += amount
            lines.append(
                {
                    "label": label,
                    "kind": "PART",
                    "amount_minor": amount,
                    "is_included": False,
                }
            )
        for row in labour:
            amount = _sell_price_for_labour(row.description)
            lines.append(
                {
                    "label": row.description,
                    "kind": "LABOUR",
                    "amount_minor": amount,
                    "is_included": False,
                }
            )
        total = sum(int(line["amount_minor"]) for line in lines)
        advance = parts_advance_amount(parts_subtotal, percent)
        self.estimates.supersede_ready(job_card.id)
        estimate = Estimate(
            job_card_id=job_card.id,
            version=self.estimates.next_version(job_card.id),
            status="READY",
            total_minor=total,
            currency="INR",
            expires_at=datetime.now(UTC) + ESTIMATE_TTL,
            content_hash=content_hash(lines),
            source="inspection",
            parts_advance_amount_minor=advance,
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
            )
        if job_card.status in {"ESTIMATE_PENDING", "INSPECTION_IN_PROGRESS", "INSPECTION_BOOKED"}:
            if job_card.status == "INSPECTION_BOOKED":
                state_machine.transition(job_card, "INSPECTION_IN_PROGRESS")
            if job_card.status == "INSPECTION_IN_PROGRESS":
                state_machine.transition(job_card, "ESTIMATE_PENDING")
            state_machine.transition(job_card, "REPAIR_APPROVAL_DUE")
        elif job_card.status == "ESTIMATE_PENDING":
            state_machine.transition(job_card, "REPAIR_APPROVAL_DUE")
        job_card.updated_at = datetime.now(UTC)
        self.job_cards.add_event(
            job_card.id,
            "INSPECTION_ESTIMATE_READY",
            actor_profile_id=actor_id,
            request_id=None,
            payload={"estimate_id": estimate.id, "total_minor": total},
        )
        self.db.add(
            OutboxEvent(
                event_type="INSPECTION_ESTIMATE_READY",
                payload={"job_card_id": job_card.id, "estimate_id": estimate.id},
            )
        )
        if job_card.profile_id:
            from app.modules.notifications.service import enqueue_intent

            enqueue_intent(
                self.db,
                profile_id=job_card.profile_id,
                intent="estimate_ready",
                entity_type="estimate",
                entity_id=estimate.id,
                context={
                    "service_name": "inspection",
                    "estimate_id": estimate.id,
                    "job_card_id": job_card.id,
                },
            )
        self.db.flush()
        loaded = self.estimates.get(estimate.id)
        assert loaded is not None
        return loaded

    def maybe_auto_publish(self, job_card: JobCard, actor_id: str | None) -> Estimate | None:
        if not _auto_publish_enabled(self.db):
            return None
        if job_card.flow_policy != "INSPECTION_REPAIR":
            return None
        return self.publish_estimate_from_findings(job_card, actor_id=actor_id)

    def customer_findings(self, job_card: JobCard) -> dict:
        inspection = self.db.scalar(
            select(Inspection)
            .where(Inspection.job_card_id == job_card.id)
            .order_by(Inspection.submitted_at.desc())
        )
        if inspection is None:
            inspection = self.db.scalar(
                select(Inspection)
                .join(Visit, Visit.id == Inspection.visit_id)
                .where(Visit.job_card_id == job_card.id)
            )
        findings = []
        if inspection is not None:
            rows = list(
                self.db.scalars(
                    select(InspectionFinding)
                    .where(InspectionFinding.inspection_id == inspection.id)
                    .order_by(InspectionFinding.sort_order, InspectionFinding.created_at)
                ).all()
            )
            for row in rows:
                media = None
                if row.media_asset_id:
                    asset = self.db.get(MediaAsset, row.media_asset_id)
                    if asset is not None:
                        media = {
                            "url": f"https://signed.local/{asset.id}",
                            "mime_type": asset.content_type,
                        }
                findings.append(
                    {
                        "id": row.id,
                        "title": row.title or row.summary,
                        "severity": (row.severity or "MEDIUM").upper(),
                        "customer_explanation": row.customer_explanation or row.summary,
                        "recommendation": row.recommendation,
                        "repair_category": row.repair_category,
                        "media": media,
                    }
                )
        estimate = self.estimates.latest_for_job(job_card.id)
        estimate_summary = None
        if estimate is not None and estimate.source == "inspection":
            estimate_summary = {
                "estimate_id": estimate.id,
                "status": estimate.status,
                "source": estimate.source,
                "version": estimate.version,
                "content_hash": estimate.content_hash,
                "total": {"amount_minor": estimate.total_minor, "currency": estimate.currency},
                "parts_advance": {
                    "amount_minor": int(estimate.parts_advance_amount_minor or 0),
                    "currency": estimate.currency,
                },
                "valid_until": estimate.expires_at.isoformat() if estimate.expires_at else None,
                "line_items": [
                    {
                        "label": line.label,
                        "amount_minor": line.amount_minor,
                        "kind": line.kind,
                        "is_included": line.is_included,
                    }
                    for line in sorted(estimate.line_items, key=lambda item: item.sort_order)
                ],
            }
        return {
            "job_card_id": job_card.id,
            "inspection": None
            if inspection is None
            else {
                "id": inspection.id,
                "summary": inspection.summary
                or (findings[0]["customer_explanation"] if findings else ""),
                "submitted_at": inspection.submitted_at.isoformat()
                if inspection.submitted_at
                else None,
            },
            "findings": findings,
            "estimate_summary": estimate_summary,
        }


def line_sort(item) -> int:
    return item.sort_order
