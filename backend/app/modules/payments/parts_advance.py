from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common.errors import DomainProblem
from app.modules.estimates.models import Estimate
from app.modules.inspection_repair.service import InspectionRepairService
from app.modules.job_cards.models import JobCard
from app.modules.job_cards.repository import JobCardRepository
from app.modules.payments.models import PartsAdvanceAllocation, Payment
from app.modules.payments.razorpay_client import get_razorpay_client


class PartsAdvanceService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.ir = InspectionRepairService(db)
        self.job_cards = JobCardRepository(db)

    def create_order(
        self,
        job_card: JobCard,
        estimate_id: str,
        expected_amount_minor: int,
        actor_id: str | None,
    ) -> Payment:
        if job_card.status != "PARTS_ADVANCE_DUE":
            raise DomainProblem(
                409,
                "INVALID_STATE_TRANSITION",
                "Parts advance is not due on this job card.",
                allowed_actions=["VIEW_ESTIMATE"],
            )
        estimate = self.db.get(Estimate, estimate_id)
        if estimate is None or estimate.job_card_id != job_card.id:
            raise DomainProblem(404, "NOT_FOUND", "Estimate not found.")
        if estimate.status not in {"ACCEPTED", "READY"}:
            raise DomainProblem(409, "INVALID_STATE_TRANSITION", "Estimate is not accepted.")
        amount = int(estimate.parts_advance_amount_minor or 0)
        if amount <= 0:
            raise DomainProblem(
                409,
                "PARTS_ADVANCE_NOT_REQUIRED",
                "No parts advance is due.",
                allowed_actions=["SELECT_REPAIR_SLOT"],
            )
        if expected_amount_minor != amount:
            raise DomainProblem(
                400,
                "INVALID_AMOUNT",
                "Parts advance amount does not match the server total.",
            )
        existing = self.db.scalar(
            select(Payment).where(
                Payment.job_card_id == job_card.id,
                Payment.estimate_id == estimate.id,
                Payment.purpose == "PARTS_ADVANCE",
                Payment.status.in_({"CREATED", "PENDING", "AUTHORIZED", "CAPTURED"}),
            )
        )
        if existing is not None:
            return existing
        order = get_razorpay_client().create_order(
            amount_minor=amount,
            currency="INR",
            receipt=job_card.public_ref,
            notes={
                "job_card_id": job_card.id,
                "estimate_id": estimate.id,
                "purpose": "PARTS_ADVANCE",
            },
        )
        payment = Payment(
            job_card_id=job_card.id,
            estimate_id=estimate.id,
            purpose="PARTS_ADVANCE",
            status="CREATED",
            amount_minor=amount,
            currency="INR",
            razorpay_order_id=order.id,
        )
        self.db.add(payment)
        self.db.flush()
        allocation = self.db.scalar(
            select(PartsAdvanceAllocation).where(
                PartsAdvanceAllocation.job_card_id == job_card.id,
                PartsAdvanceAllocation.estimate_id == estimate.id,
            )
        )
        if allocation is None:
            allocation = PartsAdvanceAllocation(
                job_card_id=job_card.id,
                estimate_id=estimate.id,
                payment_id=payment.id,
                amount_minor=amount,
                currency="INR",
                status="DUE",
            )
            self.db.add(allocation)
        else:
            allocation.payment_id = payment.id
        self.db.flush()
        return payment

    def capture(self, payment: Payment, provider_payment_id: str | None = None) -> Payment:
        from app.modules.payments.service import PaymentService

        return PaymentService(self.db).apply_capture(
            payment, provider_payment_id=provider_payment_id
        )
