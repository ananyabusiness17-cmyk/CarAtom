from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.common.errors import DomainProblem
from app.modules.advisor.models import AdvisorCallAttempt, AdvisorCase, AdvisorNote

ADVISOR_TRANSITIONS: dict[str, set[str]] = {
    "OPEN": {"CONTACTING", "CANCELLED", "CHANGES_PROPOSED", "CUSTOMER_CONFIRMATION_DUE"},
    "CONTACTING": {
        "CUSTOMER_REACHED",
        "CHANGES_PROPOSED",
        "CUSTOMER_CONFIRMATION_DUE",
        "UNREACHABLE",
        "CANCELLED",
    },
    "CUSTOMER_REACHED": {
        "CHANGES_PROPOSED",
        "CUSTOMER_CONFIRMATION_DUE",
        "UNREACHABLE",
        "CANCELLED",
    },
    "CHANGES_PROPOSED": {"CUSTOMER_CONFIRMATION_DUE", "CONTACTING", "CANCELLED"},
    "CUSTOMER_CONFIRMATION_DUE": {"CONFIRMED", "DECLINED", "CHANGES_PROPOSED"},
    "DECLINED": {"OPEN"},
    "UNREACHABLE": {"OPEN", "CONTACTING", "CANCELLED"},
    "CONFIRMED": set(),
    "CANCELLED": {"OPEN"},
    "NOT_REQUIRED": {"OPEN"},
}

WAITING_STATUSES = {
    "OPEN",
    "CONTACTING",
    "CUSTOMER_REACHED",
    "CHANGES_PROPOSED",
}
ACTIVE_INBOX = {
    "OPEN",
    "CONTACTING",
    "CUSTOMER_REACHED",
    "CHANGES_PROPOSED",
    "CUSTOMER_CONFIRMATION_DUE",
}


class AdvisorRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, case_id: str) -> AdvisorCase | None:
        return self.db.get(AdvisorCase, case_id)

    def get_by_job_card_id(self, job_card_id: str) -> AdvisorCase | None:
        return self.db.scalar(
            select(AdvisorCase)
            .where(AdvisorCase.job_card_id == job_card_id)
            .options(selectinload(AdvisorCase.call_attempts), selectinload(AdvisorCase.notes))
        )

    def list_open_cases(self, *, limit: int = 50, offset: int = 0) -> list[AdvisorCase]:
        return list(
            self.db.scalars(
                select(AdvisorCase)
                .where(AdvisorCase.status.in_(tuple(ACTIVE_INBOX)))
                .order_by(AdvisorCase.created_at.asc())
                .offset(offset)
                .limit(limit)
            ).all()
        )

    def transition(self, case: AdvisorCase, new_status: str, actor_id: str | None = None) -> None:
        allowed = ADVISOR_TRANSITIONS.get(case.status, set())
        if new_status not in allowed:
            raise DomainProblem(
                409,
                "INVALID_STATE_TRANSITION",
                f"Cannot move advisor case from {case.status} to {new_status}.",
                allowed_actions=["VIEW_ADVISOR_STATUS"],
            )
        case.status = new_status
        case.updated_at = datetime.now(UTC)
        if actor_id:
            case.assigned_admin_id = case.assigned_admin_id or actor_id

    def add_call_attempt(
        self,
        case: AdvisorCase,
        *,
        actor_id: str | None,
        channel: str = "phone",
    ) -> AdvisorCallAttempt:
        attempt = AdvisorCallAttempt(
            advisor_case_id=case.id,
            channel=channel,
            actor_id=actor_id,
            callback_requested=True,
        )
        self.db.add(attempt)
        case.attempt_count = (case.attempt_count or 0) + 1
        case.last_contact_at = datetime.now(UTC)
        return attempt

    def add_note(
        self, case: AdvisorCase, body: str, author_id: str, *, is_internal: bool = True
    ) -> None:
        self.db.add(
            AdvisorNote(
                advisor_case_id=case.id,
                body=body,
                author_id=author_id,
                is_internal=is_internal,
            )
        )
