from app.core.flow_decision import build_flow_decision
from app.modules.job_cards.models import JobCard, JobCardItem


def _card(status: str = "READY_FOR_FINALIZATION") -> JobCard:
    card = JobCard(
        id="jc-om",
        public_ref="JC-1999",
        service_offering_id="off-om",
        flow_policy="ONE_MAN",
        status=status,
        vehicle_context={
            "make": "Honda",
            "model": "City",
            "year": 2019,
            "fuel_type": "PETROL",
            "transmission": "MANUAL",
        },
    )
    card.items = [
        JobCardItem(
            id="i1",
            job_card_id="jc-om",
            kind="SERVICE",
            label_snapshot="Bulb",
            unit_price_minor=39900,
        )
    ]
    return card


def test_one_man_never_exposes_accept_estimate() -> None:
    for status in (
        "EDITABLE",
        "ESTIMATE_READY",
        "ESTIMATE_ACCEPTED",
        "READY_FOR_FINALIZATION",
        "READY_TO_BOOK",
        "BOOKING_CREATED",
    ):
        decision = build_flow_decision(_card(status), None)
        assert decision.policy == "ONE_MAN"
        assert "ACCEPT_ESTIMATE" not in decision.allowed_actions
        assert decision.advisor_requirement == "NOT_REQUIRED"


def test_one_man_ready_to_book_selects_slot() -> None:
    decision = build_flow_decision(_card("READY_TO_BOOK"), None)
    assert decision.required_next_action == "SELECT_SLOT"


def test_one_man_hold_confirms_booking() -> None:
    decision = build_flow_decision(_card("READY_TO_BOOK"), None, has_active_hold=True)
    assert decision.required_next_action == "CONFIRM_BOOKING"
