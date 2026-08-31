from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import TYPE_CHECKING

from app.modules.estimates.models import Estimate
from app.modules.job_cards.models import JobCard

if TYPE_CHECKING:
    from app.modules.advisor.models import AdvisorCase


WAITING_CASE = {"OPEN", "CONTACTING", "CUSTOMER_REACHED", "CHANGES_PROPOSED"}


@dataclass
class FlowDecision:
    policy: str
    advisor_requirement: str
    estimate_requirement: str
    required_next_action: str
    allowed_actions: list[str]
    blocking_reasons: list[str] = field(default_factory=list)
    estimate_version_id: str | None = None
    expires_at: datetime | None = None
    customer_progress: str | None = None

    def to_dict(self) -> dict:
        return {
            "policy": self.policy,
            "advisor_requirement": self.advisor_requirement,
            "estimate_requirement": self.estimate_requirement,
            "required_next_action": self.required_next_action,
            "allowed_actions": self.allowed_actions,
            "blocking_reasons": self.blocking_reasons,
            "estimate_version_id": self.estimate_version_id,
            "expires_at": self.expires_at,
            "customer_progress": self.customer_progress,
        }


def _has_repair_items(job_card: JobCard) -> bool:
    return any(item.kind == "REPAIR" for item in (job_card.items or []))


def _one_man(
    *,
    action: str,
    allowed: list[str],
    estimate_id: str | None,
    expires_at: datetime | None,
) -> FlowDecision:
    return FlowDecision(
        policy="ONE_MAN",
        advisor_requirement="NOT_REQUIRED",
        estimate_requirement="PRE_BOOKING",
        required_next_action=action,
        allowed_actions=allowed,
        estimate_version_id=estimate_id,
        expires_at=expires_at,
    )


def _gs(
    *,
    action: str,
    allowed: list[str],
    advisor: str,
    estimate_id: str | None,
    expires_at: datetime | None,
) -> FlowDecision:
    return FlowDecision(
        policy="GENERAL_SERVICE",
        advisor_requirement=advisor,
        estimate_requirement="PRE_BOOKING",
        required_next_action=action,
        allowed_actions=allowed,
        estimate_version_id=estimate_id,
        expires_at=expires_at,
    )


def _ir(
    *,
    action: str,
    allowed: list[str],
    estimate_id: str | None,
    expires_at: datetime | None,
    progress: str,
) -> FlowDecision:
    return FlowDecision(
        policy="INSPECTION_REPAIR",
        advisor_requirement="NOT_REQUIRED",
        estimate_requirement="POST_INSPECTION",
        required_next_action=action,
        allowed_actions=allowed,
        estimate_version_id=estimate_id,
        expires_at=expires_at,
        customer_progress=progress,
    )


def _inspection_repair(
    job_card: JobCard,
    estimate: Estimate | None,
    *,
    has_active_hold: bool,
) -> FlowDecision:
    from app.modules.inspection_repair.progress import customer_progress

    estimate_id = estimate.id if estimate is not None else None
    expires_at = estimate.expires_at if estimate is not None else None
    status = job_card.status
    progress = customer_progress(job_card)
    if status in {"EDITABLE"}:
        return _ir(
            action="FINALIZE",
            allowed=["EDIT_JOB_CARD", "EDIT_SYMPTOMS", "FINALIZE"],
            estimate_id=estimate_id,
            expires_at=expires_at,
            progress=progress,
        )
    if status in {"READY_FOR_FINALIZATION", "FINALIZATION_IN_PROGRESS"}:
        return _ir(
            action="FINALIZE",
            allowed=["FINALIZE", "EDIT_JOB_CARD"],
            estimate_id=estimate_id,
            expires_at=expires_at,
            progress=progress,
        )
    if status == "READY_TO_BOOK":
        if has_active_hold:
            return _ir(
                action="CONFIRM_BOOKING",
                allowed=["CONFIRM_BOOKING", "LIST_SLOTS"],
                estimate_id=estimate_id,
                expires_at=expires_at,
                progress=progress,
            )
        return _ir(
            action="SELECT_SLOT",
            allowed=["LIST_SLOTS", "FINALIZE"],
            estimate_id=estimate_id,
            expires_at=expires_at,
            progress=progress,
        )
    if status == "INSPECTION_BOOKED":
        return _ir(
            action="VIEW_BOOKING",
            allowed=["VIEW_BOOKING"],
            estimate_id=estimate_id,
            expires_at=expires_at,
            progress=progress,
        )
    if status == "INSPECTION_IN_PROGRESS":
        return _ir(
            action="VIEW_BOOKING",
            allowed=["VIEW_BOOKING"],
            estimate_id=estimate_id,
            expires_at=expires_at,
            progress=progress,
        )
    if status == "ESTIMATE_PENDING":
        return _ir(
            action="VIEW_BOOKING",
            allowed=["VIEW_BOOKING"],
            estimate_id=estimate_id,
            expires_at=expires_at,
            progress=progress,
        )
    if status == "REPAIR_APPROVAL_DUE":
        return _ir(
            action="ACCEPT_ESTIMATE",
            allowed=["VIEW_FINDINGS", "VIEW_ESTIMATE", "ACCEPT_ESTIMATE", "REJECT_ESTIMATE"],
            estimate_id=estimate_id,
            expires_at=expires_at,
            progress=progress,
        )
    if status == "PARTS_ADVANCE_DUE":
        return _ir(
            action="PAY_PARTS_ADVANCE",
            allowed=["PAY_PARTS_ADVANCE", "VIEW_ESTIMATE"],
            estimate_id=estimate_id,
            expires_at=expires_at,
            progress=progress,
        )
    if status == "PARTS_PENDING":
        return _ir(
            action="VIEW_PARTS_STATUS",
            allowed=["VIEW_PARTS_STATUS"],
            estimate_id=estimate_id,
            expires_at=expires_at,
            progress=progress,
        )
    if status == "REPAIR_BOOKING_REQUIRED":
        if has_active_hold:
            return _ir(
                action="CONFIRM_BOOKING",
                allowed=["CONFIRM_BOOKING", "SELECT_REPAIR_SLOT", "LIST_SLOTS"],
                estimate_id=estimate_id,
                expires_at=expires_at,
                progress=progress,
            )
        return _ir(
            action="SELECT_REPAIR_SLOT",
            allowed=["SELECT_REPAIR_SLOT", "LIST_SLOTS"],
            estimate_id=estimate_id,
            expires_at=expires_at,
            progress=progress,
        )
    if status in {"REPAIR_BOOKED", "REPAIR_IN_PROGRESS"}:
        return _ir(
            action="VIEW_BOOKING",
            allowed=["VIEW_BOOKING"],
            estimate_id=estimate_id,
            expires_at=expires_at,
            progress=progress,
        )
    if status == "COMPLETED":
        return _ir(
            action="VIEW_BOOKING",
            allowed=["VIEW_BOOKING"],
            estimate_id=estimate_id,
            expires_at=expires_at,
            progress=progress,
        )
    return _ir(
        action="EDIT_JOB_CARD",
        allowed=["EDIT_JOB_CARD"],
        estimate_id=estimate_id,
        expires_at=expires_at,
        progress=progress,
    )


def build_flow_decision(
    job_card: JobCard,
    estimate: Estimate | None = None,
    *,
    has_active_hold: bool = False,
    advisor_case: AdvisorCase | None = None,
) -> FlowDecision:
    estimate_id = estimate.id if estimate is not None else None
    expires_at = estimate.expires_at if estimate is not None else None
    status = job_card.status
    if job_card.flow_policy == "INSPECTION_REPAIR":
        return _inspection_repair(job_card, estimate, has_active_hold=has_active_hold)
    if job_card.flow_policy == "ONE_MAN":
        if status in {
            "ESTIMATE_ACCEPTED",
            "READY_FOR_FINALIZATION",
            "FINALIZATION_IN_PROGRESS",
        }:
            return _one_man(
                action="FINALIZE",
                allowed=["FINALIZE", "EDIT_VEHICLE"],
                estimate_id=estimate_id,
                expires_at=expires_at,
            )
        if status == "READY_TO_BOOK":
            if has_active_hold:
                return _one_man(
                    action="CONFIRM_BOOKING",
                    allowed=["CONFIRM_BOOKING", "LIST_SLOTS"],
                    estimate_id=estimate_id,
                    expires_at=expires_at,
                )
            return _one_man(
                action="SELECT_SLOT",
                allowed=["LIST_SLOTS", "FINALIZE"],
                estimate_id=estimate_id,
                expires_at=expires_at,
            )
        if status == "BOOKING_CREATED":
            return _one_man(
                action="VIEW_BOOKING",
                allowed=["VIEW_BOOKING"],
                estimate_id=estimate_id,
                expires_at=expires_at,
            )
        return _one_man(
            action="FINALIZE",
            allowed=["FINALIZE", "EDIT_VEHICLE"],
            estimate_id=estimate_id,
            expires_at=expires_at,
        )
    repairs = _has_repair_items(job_card)
    advisor = "REQUIRED_NOW" if repairs else "NOT_REQUIRED"
    case_status = advisor_case.status if advisor_case is not None else None
    if case_status == "CONFIRMED" or status in {
        "SCOPE_CONFIRMED",
        "READY_FOR_FINALIZATION",
        "FINALIZATION_IN_PROGRESS",
        "READY_TO_BOOK",
        "BOOKING_CREATED",
    }:
        if not repairs or case_status == "CONFIRMED":
            advisor = "NOT_REQUIRED"

    if not repairs:
        if status in {"EDITABLE", "PRICING", "PRICING_FAILED"}:
            return _gs(
                action="REQUEST_ESTIMATE",
                allowed=["REQUEST_ESTIMATE", "EDIT_JOB_CARD"],
                advisor="NOT_REQUIRED",
                estimate_id=estimate_id,
                expires_at=expires_at,
            )
        if status == "ESTIMATE_READY":
            return _gs(
                action="ACCEPT_ESTIMATE",
                allowed=["ACCEPT_ESTIMATE", "EDIT_JOB_CARD"],
                advisor="NOT_REQUIRED",
                estimate_id=estimate_id,
                expires_at=expires_at,
            )
        if status in {"ESTIMATE_ACCEPTED", "READY_FOR_FINALIZATION", "FINALIZATION_IN_PROGRESS"}:
            return _gs(
                action="FINALIZE",
                allowed=["FINALIZE", "EDIT_JOB_CARD"],
                advisor="NOT_REQUIRED",
                estimate_id=estimate_id,
                expires_at=expires_at,
            )
        if status == "READY_TO_BOOK":
            if has_active_hold:
                return _gs(
                    action="CONFIRM_BOOKING",
                    allowed=["CONFIRM_BOOKING", "LIST_SLOTS"],
                    advisor="NOT_REQUIRED",
                    estimate_id=estimate_id,
                    expires_at=expires_at,
                )
            return _gs(
                action="SELECT_SLOT",
                allowed=["LIST_SLOTS", "FINALIZE"],
                advisor="NOT_REQUIRED",
                estimate_id=estimate_id,
                expires_at=expires_at,
            )
        if status == "BOOKING_CREATED":
            return _gs(
                action="VIEW_BOOKING",
                allowed=["VIEW_BOOKING"],
                advisor="NOT_REQUIRED",
                estimate_id=estimate_id,
                expires_at=expires_at,
            )
        return _gs(
            action="EDIT_JOB_CARD",
            allowed=["EDIT_JOB_CARD"],
            advisor="NOT_REQUIRED",
            estimate_id=estimate_id,
            expires_at=expires_at,
        )

    if status in {"EDITABLE", "PRICING", "PRICING_FAILED"}:
        action = "EDIT_JOB_CARD" if case_status == "DECLINED" else "REQUEST_ESTIMATE"
        return _gs(
            action=action,
            allowed=["REQUEST_ESTIMATE", "EDIT_JOB_CARD"],
            advisor=advisor,
            estimate_id=estimate_id,
            expires_at=expires_at,
        )
    if status == "ESTIMATE_READY":
        return _gs(
            action="ACCEPT_ESTIMATE",
            allowed=["ACCEPT_ESTIMATE", "EDIT_JOB_CARD"],
            advisor="REQUIRED_NOW",
            estimate_id=estimate_id,
            expires_at=expires_at,
        )
    if status in {"ESTIMATE_ACCEPTED", "ADVISOR_REQUIRED"}:
        if case_status in WAITING_CASE:
            return _gs(
                action="WAIT_FOR_ADVISOR",
                allowed=["VIEW_ADVISOR_STATUS", "CONTACT_SUPPORT"],
                advisor="REQUIRED_NOW",
                estimate_id=estimate_id,
                expires_at=expires_at,
            )
        return _gs(
            action="CREATE_ADVISOR_CASE",
            allowed=["CREATE_ADVISOR_CASE", "EDIT_JOB_CARD"],
            advisor="REQUIRED_NOW",
            estimate_id=estimate_id,
            expires_at=expires_at,
        )
    if status == "ADVISOR_IN_PROGRESS":
        if case_status == "CUSTOMER_CONFIRMATION_DUE":
            return _gs(
                action="ACCEPT_REVISED_ESTIMATE",
                allowed=["ACCEPT_REVISED_ESTIMATE", "REJECT_REVISED_ESTIMATE"],
                advisor="REQUIRED_NOW",
                estimate_id=estimate_id,
                expires_at=expires_at,
            )
        return _gs(
            action="WAIT_FOR_ADVISOR",
            allowed=["VIEW_ADVISOR_STATUS", "CONTACT_SUPPORT"],
            advisor="REQUIRED_NOW",
            estimate_id=estimate_id,
            expires_at=expires_at,
        )
    if status == "REVISED_ESTIMATE_PENDING" or case_status == "CUSTOMER_CONFIRMATION_DUE":
        return _gs(
            action="ACCEPT_REVISED_ESTIMATE",
            allowed=["ACCEPT_REVISED_ESTIMATE", "REJECT_REVISED_ESTIMATE"],
            advisor="REQUIRED_NOW",
            estimate_id=estimate_id,
            expires_at=expires_at,
        )
    if status in {"SCOPE_CONFIRMED", "READY_FOR_FINALIZATION", "FINALIZATION_IN_PROGRESS"}:
        return _gs(
            action="FINALIZE",
            allowed=["FINALIZE"],
            advisor="NOT_REQUIRED",
            estimate_id=estimate_id,
            expires_at=expires_at,
        )
    if status == "READY_TO_BOOK":
        if has_active_hold:
            return _gs(
                action="CONFIRM_BOOKING",
                allowed=["CONFIRM_BOOKING", "LIST_SLOTS"],
                advisor="NOT_REQUIRED",
                estimate_id=estimate_id,
                expires_at=expires_at,
            )
        return _gs(
            action="SELECT_SLOT",
            allowed=["LIST_SLOTS", "FINALIZE"],
            advisor="NOT_REQUIRED",
            estimate_id=estimate_id,
            expires_at=expires_at,
        )
    if status == "BOOKING_CREATED":
        return _gs(
            action="VIEW_BOOKING",
            allowed=["VIEW_BOOKING"],
            advisor="NOT_REQUIRED",
            estimate_id=estimate_id,
            expires_at=expires_at,
        )
    return _gs(
        action="EDIT_JOB_CARD",
        allowed=["EDIT_JOB_CARD"],
        advisor=advisor,
        estimate_id=estimate_id,
        expires_at=expires_at,
    )
