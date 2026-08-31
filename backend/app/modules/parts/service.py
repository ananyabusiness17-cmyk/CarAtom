from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common.errors import DomainProblem
from app.modules.field_work.models import JobPart
from app.modules.inspection_repair.progress import customer_progress
from app.modules.inspection_repair.service import InspectionRepairService
from app.modules.job_cards import state_machine
from app.modules.job_cards.models import JobCard
from app.modules.job_cards.repository import JobCardRepository
from app.modules.notifications.models import OutboxEvent
from app.modules.payments.models import PartsAdvanceAllocation


class PartsService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.ir = InspectionRepairService(db)
        self.job_cards = JobCardRepository(db)

    def status_payload(self, job_card: JobCard) -> dict:
        parts = list(
            self.db.scalars(select(JobPart).where(JobPart.job_card_id == job_card.id)).all()
        )
        visible = [p for p in parts if p.readiness_status != "CANCELLED"]
        allocation = self.db.scalar(
            select(PartsAdvanceAllocation)
            .where(PartsAdvanceAllocation.job_card_id == job_card.id)
            .order_by(PartsAdvanceAllocation.created_at.desc())
        )
        captured = allocation is not None and allocation.status == "CAPTURED"
        all_ready = self.ir.parts_all_ready(job_card.id)
        return {
            "all_ready": all_ready,
            "parts_advance_captured": captured,
            "parts": [
                {
                    "id": part.id,
                    "description": part.label,
                    "readiness_status": part.readiness_status,
                    "eta_label": "Expected Wed 21" if part.readiness_status != "READY" else None,
                }
                for part in visible
            ],
            "customer_progress": customer_progress(job_card),
        }

    def mark_ready(self, job_card: JobCard, actor_id: str) -> JobCard:
        parts = list(
            self.db.scalars(select(JobPart).where(JobPart.job_card_id == job_card.id)).all()
        )
        now = datetime.now(UTC)
        for part in parts:
            if part.readiness_status in {"RECOMMENDED", "ORDERED", "IN_TRANSIT"}:
                part.readiness_status = "READY"
                part.ready_at = now
        target = self.ir.transition_on_parts_ready(job_card)
        if job_card.status != target:
            if job_card.status == "PARTS_PENDING":
                state_machine.transition(job_card, "REPAIR_BOOKING_REQUIRED")
            elif job_card.status == "REPAIR_BOOKING_REQUIRED":
                pass
            elif job_card.status == "PARTS_ADVANCE_DUE":
                raise DomainProblem(
                    409,
                    "PARTS_ADVANCE_REQUIRED",
                    "Parts advance must be captured first.",
                    allowed_actions=["PAY_PARTS_ADVANCE"],
                )
            else:
                state_machine.transition(job_card, target)
        job_card.updated_at = now
        self.job_cards.add_event(
            job_card.id,
            "PARTS_READY",
            actor_profile_id=actor_id,
            request_id=None,
        )
        self.db.add(
            OutboxEvent(
                event_type="PARTS_READY",
                payload={"job_card_id": job_card.id},
            )
        )
        if job_card.profile_id and job_card.status == "PARTS_ADVANCE_DUE":
            from app.modules.notifications.service import enqueue_intent

            enqueue_intent(
                self.db,
                profile_id=job_card.profile_id,
                intent="parts_advance_due",
                entity_type="job_card",
                entity_id=job_card.id,
                context={"service_name": "repair", "invoice_id": job_card.id},
            )
        self.db.flush()
        return job_card
