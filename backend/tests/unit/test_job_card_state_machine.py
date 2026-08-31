from app.common.errors import DomainProblem
from app.modules.job_cards.state_machine import can_transition, transition


class _Card:
    def __init__(self, status: str) -> None:
        self.status = status


def test_legal_happy_path() -> None:
    assert can_transition("EDITABLE", "PRICING")
    assert can_transition("PRICING", "ESTIMATE_READY")
    assert can_transition("ESTIMATE_READY", "ESTIMATE_ACCEPTED")
    assert can_transition("ESTIMATE_ACCEPTED", "READY_FOR_FINALIZATION")
    assert can_transition("READY_FOR_FINALIZATION", "FINALIZATION_IN_PROGRESS")
    assert can_transition("FINALIZATION_IN_PROGRESS", "READY_TO_BOOK")
    assert can_transition("BOOKING_CREATED", "IN_SERVICE")
    assert can_transition("IN_SERVICE", "COMPLETED")


def test_illegal_transition_raises() -> None:
    card = _Card("EDITABLE")
    try:
        transition(card, "BOOKING_CREATED")
    except DomainProblem as exc:
        assert exc.code == "INVALID_STATE_TRANSITION"
    else:
        raise AssertionError("expected DomainProblem")
