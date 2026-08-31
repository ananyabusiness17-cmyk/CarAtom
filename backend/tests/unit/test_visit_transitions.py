from app.common.errors import DomainProblem
from app.modules.visits.state_machine import can_transition, transition


class _Visit:
    def __init__(self, status: str, visit_type: str = "SERVICE") -> None:
        self.status = status
        self.visit_type = visit_type


def test_service_happy_path() -> None:
    assert can_transition("ASSIGNED", "EN_ROUTE")
    assert can_transition("EN_ROUTE", "ON_SITE")
    assert can_transition("ON_SITE", "SERVICE_IN_PROGRESS")
    assert can_transition("SERVICE_IN_PROGRESS", "QC_PENDING")
    assert can_transition("QC_PENDING", "COMPLETED")


def test_inspection_happy_path() -> None:
    assert can_transition("ON_SITE", "INSPECTION_IN_PROGRESS")
    assert can_transition("INSPECTION_IN_PROGRESS", "INSPECTION_SUBMITTED")
    assert can_transition("INSPECTION_SUBMITTED", "COMPLETED")


def test_illegal_transition_raises() -> None:
    visit = _Visit("ASSIGNED")
    try:
        transition(visit, "COMPLETED")
    except DomainProblem as exc:
        assert exc.code == "INVALID_STATE_TRANSITION"
    else:
        raise AssertionError("expected DomainProblem")


def test_complete_is_idempotent_on_same_status() -> None:
    visit = _Visit("COMPLETED")
    transition(visit, "COMPLETED")
    assert visit.status == "COMPLETED"
