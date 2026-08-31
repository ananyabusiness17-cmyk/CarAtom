from app.core.flow_decision import build_flow_decision
from app.modules.advisor.models import AdvisorCase
from app.modules.job_cards.models import JobCard, JobCardItem


def _card_with_repairs(status: str = "ESTIMATE_READY") -> JobCard:
    card = JobCard(
        id="jc-r",
        public_ref="JC-1042",
        service_offering_id="off-1",
        flow_policy="GENERAL_SERVICE",
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
            job_card_id="jc-r",
            kind="SERVICE",
            label_snapshot="GS",
            unit_price_minor=299900,
        ),
        JobCardItem(
            id="r1",
            job_card_id="jc-r",
            kind="REPAIR",
            label_snapshot="AC",
            unit_price_minor=120000,
        ),
    ]
    return card


def test_repairs_require_advisor_on_price_ready() -> None:
    decision = build_flow_decision(_card_with_repairs("ESTIMATE_READY"), None)
    assert decision.advisor_requirement == "REQUIRED_NOW"
    assert decision.required_next_action == "ACCEPT_ESTIMATE"


def test_accept_v1_creates_advisor_action() -> None:
    decision = build_flow_decision(_card_with_repairs("ADVISOR_REQUIRED"), None)
    assert decision.required_next_action == "CREATE_ADVISOR_CASE"


def test_waiting_after_case_open() -> None:
    case = AdvisorCase(id="c1", job_card_id="jc-r", status="OPEN")
    decision = build_flow_decision(
        _card_with_repairs("ADVISOR_IN_PROGRESS"), None, advisor_case=case
    )
    assert decision.required_next_action == "WAIT_FOR_ADVISOR"


def test_revised_pending() -> None:
    case = AdvisorCase(id="c1", job_card_id="jc-r", status="CUSTOMER_CONFIRMATION_DUE")
    decision = build_flow_decision(
        _card_with_repairs("REVISED_ESTIMATE_PENDING"), None, advisor_case=case
    )
    assert decision.required_next_action == "ACCEPT_REVISED_ESTIMATE"
    assert "REJECT_REVISED_ESTIMATE" in decision.allowed_actions


def test_confirmed_finalize() -> None:
    case = AdvisorCase(id="c1", job_card_id="jc-r", status="CONFIRMED")
    decision = build_flow_decision(
        _card_with_repairs("READY_FOR_FINALIZATION"), None, advisor_case=case
    )
    assert decision.advisor_requirement == "NOT_REQUIRED"
    assert decision.required_next_action == "FINALIZE"
