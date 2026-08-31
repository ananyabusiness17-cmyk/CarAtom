from app.core.flow_decision import build_flow_decision
from app.modules.estimates.models import Estimate
from app.modules.job_cards.models import JobCard


def _card(status: str) -> JobCard:
    return JobCard(
        id="jc-ir",
        public_ref="JC-1082",
        service_offering_id="off-ir",
        flow_policy="INSPECTION_REPAIR",
        status=status,
        vehicle_context={
            "make": "Honda",
            "model": "City",
            "year": 2019,
            "fuel_type": "PETROL",
            "transmission": "MANUAL",
        },
    )


def _est() -> Estimate:
    return Estimate(
        id="est-ir",
        job_card_id="jc-ir",
        version=1,
        status="READY",
        total_minor=1249900,
        content_hash="x",
        source="inspection",
        parts_advance_amount_minor=480000,
    )


CASES = [
    ("EDITABLE", "FINALIZE", None),
    ("READY_FOR_FINALIZATION", "FINALIZE", None),
    ("FINALIZATION_IN_PROGRESS", "FINALIZE", None),
    ("READY_TO_BOOK", "SELECT_SLOT", None),
    ("INSPECTION_BOOKED", "VIEW_BOOKING", None),
    ("INSPECTION_IN_PROGRESS", "VIEW_BOOKING", None),
    ("ESTIMATE_PENDING", "VIEW_BOOKING", None),
    ("REPAIR_APPROVAL_DUE", "ACCEPT_ESTIMATE", "est-ir"),
    ("PARTS_ADVANCE_DUE", "PAY_PARTS_ADVANCE", "est-ir"),
    ("PARTS_PENDING", "VIEW_PARTS_STATUS", "est-ir"),
    ("REPAIR_BOOKING_REQUIRED", "SELECT_REPAIR_SLOT", "est-ir"),
    ("REPAIR_BOOKED", "VIEW_BOOKING", "est-ir"),
    ("REPAIR_IN_PROGRESS", "VIEW_BOOKING", "est-ir"),
    ("COMPLETED", "VIEW_BOOKING", "est-ir"),
]


def test_ir_matrix_actions() -> None:
    for status, action, estimate_id in CASES:
        estimate = _est() if estimate_id else None
        decision = build_flow_decision(_card(status), estimate)
        assert decision.policy == "INSPECTION_REPAIR"
        assert decision.estimate_requirement == "POST_INSPECTION"
        assert decision.advisor_requirement == "NOT_REQUIRED"
        assert decision.required_next_action == action, status
        assert "CREATE_ADVISOR_CASE" not in decision.allowed_actions


def test_ir_ready_to_book_with_hold() -> None:
    decision = build_flow_decision(_card("READY_TO_BOOK"), None, has_active_hold=True)
    assert decision.required_next_action == "CONFIRM_BOOKING"


def test_ir_repair_booking_with_hold() -> None:
    decision = build_flow_decision(_card("REPAIR_BOOKING_REQUIRED"), _est(), has_active_hold=True)
    assert decision.required_next_action == "CONFIRM_BOOKING"
    assert "SELECT_REPAIR_SLOT" in decision.allowed_actions


def test_ir_approval_allows_findings() -> None:
    decision = build_flow_decision(_card("REPAIR_APPROVAL_DUE"), _est())
    assert "VIEW_FINDINGS" in decision.allowed_actions
    assert "REJECT_ESTIMATE" in decision.allowed_actions
    assert decision.customer_progress == "ESTIMATE_APPROVAL_REQUIRED"


def test_progress_parts_pending() -> None:
    decision = build_flow_decision(_card("PARTS_PENDING"), _est())
    assert decision.customer_progress == "REPAIR_BOOKING_REQUIRED"


def test_progress_parts_advance() -> None:
    decision = build_flow_decision(_card("PARTS_ADVANCE_DUE"), _est())
    assert decision.customer_progress == "PARTS_PAYMENT_REQUIRED"
