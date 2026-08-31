from app.core.flow_decision import build_flow_decision
from app.modules.estimates.models import Estimate
from app.modules.job_cards.models import JobCard, JobCardItem


def _card(**kwargs) -> JobCard:
    card = JobCard(
        id="jc-1",
        public_ref="JC-1050",
        service_offering_id="off-1",
        flow_policy="GENERAL_SERVICE",
        status=kwargs.get("status", "EDITABLE"),
        vehicle_context={
            "make": "Honda",
            "model": "City",
            "year": 2019,
            "fuel_type": "PETROL",
            "transmission": "MANUAL",
        },
    )
    card.items = kwargs.get(
        "items",
        [
            JobCardItem(
                id="i1",
                job_card_id="jc-1",
                kind="SERVICE",
                label_snapshot="GS",
                unit_price_minor=299900,
            )
        ],
    )
    return card


def test_editable_requests_estimate() -> None:
    decision = build_flow_decision(_card(status="EDITABLE"), None)
    assert decision.advisor_requirement == "NOT_REQUIRED"
    assert decision.required_next_action == "REQUEST_ESTIMATE"
    assert "CREATE_ADVISOR_CASE" not in decision.allowed_actions


def test_estimate_ready_accept() -> None:
    estimate = Estimate(
        id="est-1",
        job_card_id="jc-1",
        version=1,
        status="READY",
        total_minor=299900,
        content_hash="x",
    )
    decision = build_flow_decision(_card(status="ESTIMATE_READY"), estimate)
    assert decision.required_next_action == "ACCEPT_ESTIMATE"
    assert decision.advisor_requirement == "NOT_REQUIRED"
    assert "CREATE_ADVISOR_CASE" not in decision.allowed_actions


def test_accepted_goes_to_finalize() -> None:
    decision = build_flow_decision(_card(status="ESTIMATE_ACCEPTED"), None)
    assert decision.required_next_action == "FINALIZE"
    assert decision.advisor_requirement == "NOT_REQUIRED"


def test_ready_to_book_select_slot() -> None:
    decision = build_flow_decision(_card(status="READY_TO_BOOK"), None)
    assert decision.required_next_action == "SELECT_SLOT"


def test_ready_to_book_with_hold_confirms() -> None:
    decision = build_flow_decision(_card(status="READY_TO_BOOK"), None, has_active_hold=True)
    assert decision.required_next_action == "CONFIRM_BOOKING"


def test_repair_items_require_advisor() -> None:
    card = _card()
    card.items = [
        JobCardItem(
            id="r1", job_card_id="jc-1", kind="REPAIR", label_snapshot="AC", unit_price_minor=1
        )
    ]
    decision = build_flow_decision(card, None)
    assert decision.advisor_requirement == "REQUIRED_NOW"
    assert decision.required_next_action == "REQUEST_ESTIMATE"
