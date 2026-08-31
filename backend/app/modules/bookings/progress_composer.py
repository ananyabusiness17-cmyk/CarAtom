from dataclasses import dataclass
from typing import Any

PROGRESS_KEYS = (
    "BUILDING",
    "ESTIMATE_READY",
    "ACTION_REQUIRED",
    "ADVISOR_CONTACTING",
    "READY_TO_BOOK",
    "BOOKING_CONFIRMED",
    "VISIT_IN_PROGRESS",
    "ESTIMATE_APPROVAL_REQUIRED",
    "PARTS_PAYMENT_REQUIRED",
    "REPAIR_BOOKING_REQUIRED",
    "COMPLETED",
    "PAYMENT_DUE",
    "PAYMENT_VERIFICATION_PENDING",
    "PAID",
    "SUPPORT_REQUIRED",
)

IN_PROGRESS_VISIT = {
    "EN_ROUTE",
    "CHECKED_IN",
    "ON_SITE",
    "SERVICE_IN_PROGRESS",
    "QC_PENDING",
    "INSPECTION_IN_PROGRESS",
}

OPEN_PAYMENT = {"CREATED", "PENDING", "AUTHORIZED"}


@dataclass
class ProgressStep:
    key: str
    label: str
    status: str


@dataclass
class CustomerProgress:
    key: str
    headline: str
    subheadline: str | None
    steps: list[ProgressStep]
    primary_action: str | None = None


def compose_customer_progress(
    *,
    booking_status: str,
    job_status: str | None,
    flow_policy: str | None,
    visit_states: list[str],
    invoice_status: str | None,
    invoice_balance_minor: int = 0,
    payment_statuses: list[str],
    review_submitted: bool,
    ir_progress: str | None = None,
) -> CustomerProgress:
    key = _progress_key(
        booking_status=booking_status,
        job_status=job_status,
        flow_policy=flow_policy,
        visit_states=visit_states,
        invoice_status=invoice_status,
        invoice_balance_minor=invoice_balance_minor,
        payment_statuses=payment_statuses,
        review_submitted=review_submitted,
        ir_progress=ir_progress,
    )
    headline, subheadline = _copy(key)
    steps = _steps(key)
    actions = derive_allowed_actions(
        invoice_status=invoice_status,
        invoice_balance_minor=invoice_balance_minor,
        payment_statuses=payment_statuses,
        review_submitted=review_submitted,
        progress_key=key,
        visit_states=visit_states,
    )
    return CustomerProgress(
        key=key,
        headline=headline,
        subheadline=subheadline,
        steps=steps,
        primary_action=actions[0] if actions else None,
    )


def derive_allowed_actions(
    *,
    invoice_status: str | None,
    invoice_balance_minor: int,
    payment_statuses: list[str],
    review_submitted: bool,
    progress_key: str,
    visit_states: list[str],
) -> list[str]:
    pending_verify = any(status in OPEN_PAYMENT for status in payment_statuses)
    if progress_key == "PAYMENT_VERIFICATION_PENDING" or (
        pending_verify and invoice_status in {"ISSUED", "PARTIALLY_PAID"}
    ):
        return ["VIEW_INVOICE", "PAYMENT_PENDING"]
    if progress_key == "PARTS_PAYMENT_REQUIRED":
        return ["PAY_PARTS_ADVANCE", "VIEW_INVOICE"]
    if progress_key == "REPAIR_BOOKING_REQUIRED":
        return ["BOOK_REPAIR_VISIT", "CONTACT_SUPPORT"]
    if (
        any(state in IN_PROGRESS_VISIT for state in visit_states)
        and progress_key == "VISIT_IN_PROGRESS"
    ):
        return ["CONTACT_SUPPORT"]
    if invoice_status in {"ISSUED", "PARTIALLY_PAID"} and invoice_balance_minor > 0:
        return ["VIEW_INVOICE", "PAY_BALANCE"]
    if invoice_status == "PAID" and not review_submitted:
        return ["VIEW_INVOICE", "DOWNLOAD_PDF", "SUBMIT_REVIEW"]
    if invoice_status == "PAID" and review_submitted:
        return ["VIEW_INVOICE", "DOWNLOAD_PDF"]
    if progress_key in {"COMPLETED", "PAID"} and not review_submitted:
        return ["SUBMIT_REVIEW"]
    return []


def _progress_key(
    *,
    booking_status: str,
    job_status: str | None,
    flow_policy: str | None,
    visit_states: list[str],
    invoice_status: str | None,
    invoice_balance_minor: int,
    payment_statuses: list[str],
    review_submitted: bool,
    ir_progress: str | None,
) -> str:
    if any(state == "SUPPORT_REQUIRED" for state in visit_states):
        return "SUPPORT_REQUIRED"
    if invoice_status == "PAID":
        return "COMPLETED"

    if flow_policy == "INSPECTION_REPAIR" and ir_progress:
        if ir_progress in {
            "PARTS_PAYMENT_REQUIRED",
            "REPAIR_BOOKING_REQUIRED",
            "ESTIMATE_APPROVAL_REQUIRED",
            "VISIT_IN_PROGRESS",
            "BOOKING_CONFIRMED",
        }:
            return ir_progress
        mapped = {
            "ESTIMATE_PENDING": "ESTIMATE_APPROVAL_REQUIRED",
        }.get(ir_progress)
        if mapped:
            return mapped

    pending = any(status in OPEN_PAYMENT for status in payment_statuses)
    visits_done = bool(visit_states) and all(state == "COMPLETED" for state in visit_states)
    booking_done = booking_status == "COMPLETED" or visits_done
    if booking_done and pending and invoice_status in {"ISSUED", "PARTIALLY_PAID", None}:
        return "PAYMENT_VERIFICATION_PENDING"
    if (
        booking_done
        and invoice_status in {"ISSUED", "PARTIALLY_PAID"}
        and invoice_balance_minor > 0
    ):
        return "PAYMENT_DUE"
    if booking_done and invoice_status is None:
        return "PAYMENT_DUE" if job_status == "COMPLETED" or visits_done else "COMPLETED"

    if any(state in IN_PROGRESS_VISIT for state in visit_states):
        return "VISIT_IN_PROGRESS"
    if booking_status in {"CONFIRMED", "HOLDING"}:
        return "BOOKING_CONFIRMED"
    if job_status in {"READY_TO_BOOK", "ESTIMATE_READY"}:
        return job_status if job_status in PROGRESS_KEYS else "READY_TO_BOOK"
    return "BOOKING_CONFIRMED" if booking_status else "BUILDING"


def _copy(key: str) -> tuple[str, str | None]:
    copy = {
        "BOOKING_CONFIRMED": ("Booking confirmed", "We will assign a van before your slot"),
        "VISIT_IN_PROGRESS": ("Technician on the way", "Live updates appear as the visit proceeds"),
        "ESTIMATE_APPROVAL_REQUIRED": ("Estimate ready", "Review findings and approve repairs"),
        "PARTS_PAYMENT_REQUIRED": ("Parts advance due", "Pay the parts advance to continue"),
        "REPAIR_BOOKING_REQUIRED": ("Parts ready", "Book your repair visit"),
        "PAYMENT_DUE": ("Service complete", "Pay your invoice to download receipt"),
        "PAYMENT_VERIFICATION_PENDING": (
            "Confirming your payment…",
            "This usually takes a few seconds",
        ),
        "COMPLETED": ("All done", "Thank you for choosing CARATOM"),
        "PAID": ("All done", "Your receipt is ready to download"),
        "SUPPORT_REQUIRED": ("We need a moment", "Support is reviewing this visit"),
    }
    return copy.get(key, ("Booking update", None))


def _steps(key: str) -> list[ProgressStep]:
    order = ["booked", "visit", "invoice", "review"]
    labels = {"booked": "Booked", "visit": "Visit", "invoice": "Invoice", "review": "Review"}
    active = {
        "BOOKING_CONFIRMED": "booked",
        "VISIT_IN_PROGRESS": "visit",
        "ESTIMATE_APPROVAL_REQUIRED": "visit",
        "PARTS_PAYMENT_REQUIRED": "invoice",
        "REPAIR_BOOKING_REQUIRED": "visit",
        "PAYMENT_DUE": "invoice",
        "PAYMENT_VERIFICATION_PENDING": "invoice",
        "COMPLETED": "review",
        "PAID": "review",
    }.get(key, "booked")
    if key == "COMPLETED":
        statuses = {step: "done" for step in order}
        statuses["review"] = "active"
        return [ProgressStep(step, labels[step], statuses[step]) for step in order]
    result: list[ProgressStep] = []
    seen_active = False
    for step in order:
        if step == active:
            result.append(ProgressStep(step, labels[step], "active"))
            seen_active = True
        elif not seen_active:
            result.append(ProgressStep(step, labels[step], "done"))
        else:
            result.append(ProgressStep(step, labels[step], "pending"))
    return result


def progress_to_dict(progress: CustomerProgress) -> dict[str, Any]:
    return {
        "key": progress.key,
        "headline": progress.headline,
        "subheadline": progress.subheadline,
        "steps": [
            {"key": step.key, "label": step.label, "status": step.status} for step in progress.steps
        ],
        "primary_action": progress.primary_action,
    }
