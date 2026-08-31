from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy.orm import Session

from app.common.errors import DomainProblem
from app.core.deps import CurrentUser
from app.core.flow_decision import build_flow_decision
from app.db.models import Profile
from app.modules.advisor.models import AdvisorCase
from app.modules.advisor.repository import AdvisorRepository
from app.modules.advisor.schemas import (
    ADVISOR_DISPLAY_NAME,
    EXPECTED_WINDOW_MINUTES,
    SAFE_STATUS_LABELS,
    AdvisorCaseCustomerOut,
    AdvisorCaseEnvelope,
)
from app.modules.estimates.models import Estimate
from app.modules.estimates.repository import EstimateRepository
from app.modules.job_cards import state_machine
from app.modules.job_cards.service import JobCardService, to_flow_schema


def submitted_total(job_card) -> int:
    return sum(item.unit_price_minor * item.quantity for item in job_card.items)


class AdvisorService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = AdvisorRepository(db)
        self.job_cards = JobCardService(db)
        self.estimates = EstimateRepository(db)

    def _decision(self, job_card, estimate: Estimate | None = None):
        case = self.repo.get_by_job_card_id(job_card.id)
        if estimate is None:
            estimate = self.estimates.latest_for_job(job_card.id)
        return build_flow_decision(
            job_card,
            estimate,
            has_active_hold=self.job_cards._active_hold(job_card.id) is not None,
            advisor_case=case,
        )

    def customer_view(self, case: AdvisorCase, job_card) -> AdvisorCaseCustomerOut:
        pending = None
        pending_out = None
        if case.pending_estimate_id:
            pending = self.estimates.get(case.pending_estimate_id)
            if pending is not None:
                pending_out = self.job_cards.to_estimate_out(pending)
        latest = self.estimates.latest_for_job(job_card.id)
        total = latest.total_minor if latest is not None else submitted_total(job_card)
        return AdvisorCaseCustomerOut(
            id=case.id,
            status=case.status,
            safe_status_label=SAFE_STATUS_LABELS.get(case.status, case.status),
            advisor_display_name=ADVISOR_DISPLAY_NAME,
            expected_response_window_minutes=EXPECTED_WINDOW_MINUTES,
            submitted_total_minor=total,
            pending_estimate_id=case.pending_estimate_id,
            pending_estimate=pending_out,
        )

    def create_case(
        self, job_card_id: str, user: CurrentUser, request_id: str | None
    ) -> AdvisorCaseEnvelope:
        job_card = self.job_cards.get_accessible(job_card_id, user)
        if not any(item.kind == "REPAIR" for item in job_card.items):
            raise DomainProblem(
                409,
                "ADVISOR_CASE_NOT_OPEN",
                "Advisor is only required when repair add-ons are on the job card.",
                allowed_actions=["REQUEST_ESTIMATE"],
            )
        if job_card.status not in {"ESTIMATE_ACCEPTED", "ADVISOR_REQUIRED", "ADVISOR_IN_PROGRESS"}:
            raise DomainProblem(
                409,
                "INVALID_STATE_TRANSITION",
                "Accept the estimate before requesting a callback.",
                allowed_actions=["ACCEPT_ESTIMATE", "EDIT_JOB_CARD"],
            )
        if not user.phone_verified and not user.phone:
            raise DomainProblem(
                401,
                "AUTH_REQUIRED",
                "Sign in with a reachable phone number for the advisor call.",
                allowed_actions=["AUTHENTICATE"],
            )
        case = self.repo.get_by_job_card_id(job_card.id)
        if case is None:
            case = AdvisorCase(
                id=str(uuid4()),
                job_card_id=job_card.id,
                status="OPEN",
                verified_phone_e164=user.phone,
            )
            self.db.add(case)
            self.db.flush()
        elif case.status == "DECLINED":
            self.repo.transition(case, "OPEN")
            case.pending_estimate_id = None
            case.customer_response = None
        elif case.status == "CONFIRMED":
            raise DomainProblem(
                409,
                "ADVISOR_CASE_NOT_OPEN",
                "This job card already has a confirmed advisor case.",
            )
        if job_card.status == "ADVISOR_REQUIRED":
            state_machine.transition(job_card, "ADVISOR_IN_PROGRESS")
        elif job_card.status == "ESTIMATE_ACCEPTED":
            state_machine.transition(job_card, "ADVISOR_REQUIRED")
            state_machine.transition(job_card, "ADVISOR_IN_PROGRESS")
        job_card.updated_at = datetime.now(UTC)
        self.job_cards.repo.add_event(
            job_card.id,
            "ADVISOR_CASE_CREATED",
            actor_profile_id=user.id,
            request_id=request_id,
            payload={"advisor_case_id": case.id},
        )
        from app.modules.notifications.service import enqueue_admins, enqueue_intent

        enqueue_intent(
            self.db,
            profile_id=user.id,
            intent="advisor_call_requested",
            entity_type="advisor",
            entity_id=case.id,
            context={
                "service_name": "your request",
                "advisor_case_id": case.id,
                "job_card_id": job_card.id,
            },
            request_id=request_id,
        )
        enqueue_admins(
            self.db,
            intent="advisor_case_waiting",
            entity_type="advisor",
            entity_id=case.id,
            context={"advisor_case_id": case.id, "job_card_id": job_card.id},
            request_id=request_id,
        )
        self.db.commit()
        loaded = self.job_cards.repo.get(job_card.id)
        assert loaded is not None
        case = self.repo.get_by_job_card_id(loaded.id)
        assert case is not None
        return AdvisorCaseEnvelope(
            advisor_case=self.customer_view(case, loaded),
            flow_decision=to_flow_schema(self._decision(loaded)),
        )

    def get_customer_case(self, job_card_id: str, user: CurrentUser | None) -> AdvisorCaseEnvelope:
        job_card = self.job_cards.get_accessible(job_card_id, user)
        case = self.repo.get_by_job_card_id(job_card.id)
        if case is None:
            raise DomainProblem(404, "NOT_FOUND", "Not found.")
        pending = self.estimates.get(case.pending_estimate_id) if case.pending_estimate_id else None
        return AdvisorCaseEnvelope(
            advisor_case=self.customer_view(case, job_card),
            flow_decision=to_flow_schema(self._decision(job_card, pending)),
        )

    def start_contact(self, job_card_id: str, admin: CurrentUser) -> AdvisorCase:
        case = self.repo.get_by_job_card_id(job_card_id)
        if case is None:
            raise DomainProblem(404, "NOT_FOUND", "Not found.")
        if case.status == "OPEN":
            self.repo.transition(case, "CONTACTING", admin.id)
            self.repo.add_call_attempt(case, actor_id=admin.id)
        job_card = self.job_cards.repo.get(job_card_id)
        if job_card is not None and job_card.status == "ADVISOR_REQUIRED":
            state_machine.transition(job_card, "ADVISOR_IN_PROGRESS")
        profile = self.db.get(Profile, admin.id)
        if profile is not None and not profile.full_name:
            profile.full_name = ADVISOR_DISPLAY_NAME
        self.db.commit()
        return case
