from app.common.errors import DomainProblem

TRANSITIONS: dict[str, set[str]] = {
    "EDITABLE": {
        "PRICING",
        "ABANDONED",
        "CANCELLED",
        "READY_FOR_FINALIZATION",
        "FINALIZATION_IN_PROGRESS",
    },
    "PRICING": {"ESTIMATE_READY", "PRICING_FAILED", "EDITABLE"},
    "PRICING_FAILED": {"EDITABLE", "PRICING"},
    "ESTIMATE_READY": {"ESTIMATE_ACCEPTED", "EDITABLE", "PRICING"},
    "ESTIMATE_ACCEPTED": {"READY_FOR_FINALIZATION", "ADVISOR_REQUIRED"},
    "ADVISOR_REQUIRED": {
        "ADVISOR_IN_PROGRESS",
        "REVISED_ESTIMATE_PENDING",
        "EDITABLE",
        "CANCELLED",
    },
    "ADVISOR_IN_PROGRESS": {
        "REVISED_ESTIMATE_PENDING",
        "EDITABLE",
        "CANCELLED",
        "ADVISOR_REQUIRED",
    },
    "REVISED_ESTIMATE_PENDING": {"SCOPE_CONFIRMED", "EDITABLE", "ADVISOR_IN_PROGRESS"},
    "SCOPE_CONFIRMED": {"READY_FOR_FINALIZATION"},
    "READY_FOR_FINALIZATION": {"FINALIZATION_IN_PROGRESS", "EDITABLE"},
    "FINALIZATION_IN_PROGRESS": {"READY_TO_BOOK", "READY_FOR_FINALIZATION"},
    "READY_TO_BOOK": {"BOOKING_CREATED", "INSPECTION_BOOKED", "ABANDONED"},
    "BOOKING_CREATED": {"IN_SERVICE", "COMPLETED", "CANCELLED"},
    "IN_SERVICE": {"COMPLETED", "CANCELLED"},
    "INSPECTION_BOOKED": {"INSPECTION_IN_PROGRESS", "CANCELLED"},
    "INSPECTION_IN_PROGRESS": {"ESTIMATE_PENDING", "CANCELLED"},
    "ESTIMATE_PENDING": {"REPAIR_APPROVAL_DUE", "CANCELLED"},
    "REPAIR_APPROVAL_DUE": {
        "PARTS_ADVANCE_DUE",
        "PARTS_PENDING",
        "REPAIR_BOOKING_REQUIRED",
        "EDITABLE",
        "CANCELLED",
    },
    "PARTS_ADVANCE_DUE": {"PARTS_PENDING", "REPAIR_BOOKING_REQUIRED", "CANCELLED"},
    "PARTS_PENDING": {"REPAIR_BOOKING_REQUIRED", "CANCELLED"},
    "REPAIR_BOOKING_REQUIRED": {"REPAIR_BOOKED", "CANCELLED"},
    "REPAIR_BOOKED": {"REPAIR_IN_PROGRESS", "CANCELLED"},
    "REPAIR_IN_PROGRESS": {"COMPLETED", "CANCELLED"},
}


def can_transition(current: str, target: str) -> bool:
    return target in TRANSITIONS.get(current, set())


def transition(job_card, target: str) -> None:
    if not can_transition(job_card.status, target):
        raise DomainProblem(
            409,
            "INVALID_STATE_TRANSITION",
            f"Cannot move job card from {job_card.status} to {target}.",
            allowed_actions=_recovery_actions(job_card.status),
        )
    job_card.status = target


def _recovery_actions(status: str) -> list[str]:
    if status in {"EDITABLE", "PRICING", "PRICING_FAILED"}:
        return ["REQUEST_ESTIMATE", "EDIT_JOB_CARD"]
    if status == "ESTIMATE_READY":
        return ["ACCEPT_ESTIMATE", "EDIT_JOB_CARD"]
    if status in {"ESTIMATE_ACCEPTED", "ADVISOR_REQUIRED"}:
        return ["CREATE_ADVISOR_CASE", "EDIT_JOB_CARD"]
    if status in {"ADVISOR_IN_PROGRESS", "REVISED_ESTIMATE_PENDING"}:
        return ["VIEW_ADVISOR_STATUS", "ACCEPT_REVISED_ESTIMATE", "REJECT_REVISED_ESTIMATE"]
    if status in {"SCOPE_CONFIRMED", "READY_FOR_FINALIZATION"}:
        return ["FINALIZE", "EDIT_JOB_CARD"]
    if status == "READY_TO_BOOK":
        return ["LIST_SLOTS", "FINALIZE"]
    if status == "REPAIR_APPROVAL_DUE":
        return ["VIEW_FINDINGS", "ACCEPT_ESTIMATE", "REJECT_ESTIMATE"]
    if status == "PARTS_ADVANCE_DUE":
        return ["PAY_PARTS_ADVANCE"]
    if status in {"PARTS_PENDING", "REPAIR_BOOKING_REQUIRED"}:
        return ["VIEW_PARTS_STATUS", "SELECT_REPAIR_SLOT"]
    return []
