from app.common.errors import DomainProblem

TRANSITIONS: dict[str, set[str]] = {
    "SCHEDULED": {"ASSIGNED", "CANCELLED"},
    "ASSIGNED": {"EN_ROUTE", "UNASSIGNED", "CANCELLED"},
    "EN_ROUTE": {"ON_SITE", "LATE", "CANCELLED"},
    "LATE": {"ON_SITE", "CANCELLED", "SUPPORT_REQUIRED"},
    "ON_SITE": {"INSPECTION_IN_PROGRESS", "SERVICE_IN_PROGRESS"},
    "INSPECTION_IN_PROGRESS": {"INSPECTION_SUBMITTED", "SUPPORT_REQUIRED"},
    "SERVICE_IN_PROGRESS": {"QC_PENDING", "SUPPORT_REQUIRED"},
    "INSPECTION_SUBMITTED": {"COMPLETED"},
    "QC_PENDING": {"COMPLETED", "QC_FAILED"},
    "QC_FAILED": {"SERVICE_IN_PROGRESS", "FOLLOW_UP_REQUIRED", "COMPLETED"},
    "FOLLOW_UP_REQUIRED": {"SCHEDULED"},
    "SUPPORT_REQUIRED": {"SERVICE_IN_PROGRESS", "INSPECTION_IN_PROGRESS", "ON_SITE", "CANCELLED"},
    "UNASSIGNED": {"ASSIGNED", "CANCELLED"},
    "COMPLETED": set(),
    "CANCELLED": set(),
}

ALLOWED_ACTIONS = (
    "VIEW",
    "EN_ROUTE",
    "CHECK_IN",
    "START_INSPECTION",
    "START_SERVICE",
    "SUBMIT_INSPECTION",
    "RECORD_PARTS",
    "RECORD_LABOUR",
    "SUBMIT_QC",
    "COMPLETE",
    "RAISE_EXCEPTION",
)


def can_transition(current: str, target: str) -> bool:
    return target in TRANSITIONS.get(current, set())


def transition(visit, target: str) -> None:
    if visit.status == target:
        return
    if not can_transition(visit.status, target):
        raise DomainProblem(
            409,
            "INVALID_STATE_TRANSITION",
            f"Cannot move visit from {visit.status} to {target}.",
            allowed_actions=build_allowed_actions(visit.status, visit.visit_type),
        )
    visit.status = target


def build_allowed_actions(status: str, visit_type: str) -> list[str]:
    actions = ["VIEW"]
    if status == "ASSIGNED":
        actions.append("EN_ROUTE")
    if status in {"EN_ROUTE", "LATE"}:
        actions.append("CHECK_IN")
    if status == "ON_SITE":
        if visit_type == "INSPECTION":
            actions.append("START_INSPECTION")
        else:
            actions.append("START_SERVICE")
        actions.append("RAISE_EXCEPTION")
    if status == "INSPECTION_IN_PROGRESS":
        actions.extend(["SUBMIT_INSPECTION", "RAISE_EXCEPTION"])
    if status == "SERVICE_IN_PROGRESS":
        actions.extend(["RECORD_PARTS", "RECORD_LABOUR", "SUBMIT_QC", "RAISE_EXCEPTION"])
    if status == "QC_PENDING":
        actions.extend(["SUBMIT_QC", "COMPLETE", "RECORD_PARTS"])
    if status == "INSPECTION_SUBMITTED":
        actions.append("COMPLETE")
    if status == "QC_FAILED":
        actions.extend(["START_SERVICE", "RAISE_EXCEPTION"])
    return actions
