from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common.errors import DomainProblem
from app.core.deps import CurrentUser
from app.modules.admin.payments_service import PaymentsAdminService
from app.modules.admin.schemas import (
    AllowedOverrideActionsOut,
    OfflinePaymentRequest,
    OverrideRequest,
    OverrideResponse,
)
from app.modules.audit.service import AuditService, require_reason
from app.modules.bookings.models import Booking
from app.modules.invoices.models import Invoice
from app.modules.invoices.service import InvoiceService
from app.modules.job_cards import state_machine
from app.modules.job_cards.service import JobCardService
from app.modules.slots.service import SlotService
from app.modules.visits.models import Visit

KNOWN_STATUSES = set(state_machine.TRANSITIONS.keys()) | {
    "COMPLETED",
    "CANCELLED",
    "ABANDONED",
    "PAID",
}
STATUS_ALIASES = {"INVOICED": "COMPLETED"}
LITE_ACTIONS = {
    "FORCE_STATUS",
    "MOVE_SLOT",
    "RECORD_OFFLINE_PAYMENT",
    "DESK_COMPLETE",
}
WEB_ACTIONS = LITE_ACTIONS | {"CANCEL_JOB"}


class OverrideService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.audit = AuditService(db)
        self.jobs = JobCardService(db)

    def allowed_actions(
        self, job_card_id: str, *, surface: str | None
    ) -> AllowedOverrideActionsOut:
        from app.modules.job_cards.models import JobCard

        loaded = self.db.get(JobCard, job_card_id)
        if loaded is None:
            raise DomainProblem(404, "NOT_FOUND", "Job card not found.")
        actions = sorted(LITE_ACTIONS if surface == "admin_mobile" else WEB_ACTIONS)
        targets = sorted(
            state_machine.TRANSITIONS.get(loaded.status, set()) | {"COMPLETED", "CANCELLED"}
        )
        return AllowedOverrideActionsOut(actions=list(actions), allowed_targets=list(targets))

    def apply(
        self,
        job_card_id: str,
        body: OverrideRequest,
        actor: CurrentUser,
        request_id: str | None,
        *,
        client_surface: str | None = None,
    ) -> OverrideResponse:
        command = body.resolved_command()
        reason = require_reason(body.reason, command=f"override.{command}")
        job = self.jobs.get_accessible(job_card_id, actor)
        before = {"status": job.status}
        if command == "FORCE_STATUS":
            target = (body.target_status or "").upper()
            target = STATUS_ALIASES.get(target, target)
            if not target or (target not in KNOWN_STATUSES and target not in STATUS_ALIASES):
                raise DomainProblem(
                    409,
                    "INVALID_STATE_TRANSITION",
                    f"Unknown target status {body.target_status}.",
                    allowed_actions=list(state_machine.TRANSITIONS.get(job.status, set())),
                )
            if target == "COMPLETED":
                booking = self.db.scalar(select(Booking).where(Booking.job_card_id == job.id))
                if booking is not None:
                    InvoiceService(self.db).issue_for_booking(booking.id, force=True)
            job.status = target
            job.updated_at = datetime.now(UTC)
        elif command == "CANCEL_JOB":
            job.status = "CANCELLED"
            job.updated_at = datetime.now(UTC)
        elif command == "DESK_COMPLETE":
            visit_id = str(body.payload.get("visit_id") or "")
            visit = self.db.get(Visit, visit_id) if visit_id else None
            if visit_id and (visit is None or visit.job_card_id != job.id):
                raise DomainProblem(404, "NOT_FOUND", "Visit not found for this job.")
            if visit is not None:
                visit.status = "COMPLETED"
                visit.updated_at = datetime.now(UTC)
            job.status = "COMPLETED"
            job.updated_at = datetime.now(UTC)
        elif command == "MOVE_SLOT":
            slot_id = str(body.payload.get("slot_hold_id") or body.payload.get("slot_id") or "")
            if not slot_id:
                raise DomainProblem(422, "SLOT_UNAVAILABLE", "payload.slot_id is required.")
            try:
                SlotService(self.db).create_hold(job.id, slot_id, actor, None)
            except DomainProblem as exc:
                if exc.code in {"INVALID_SLOT", "HOLD_EXPIRED"}:
                    raise DomainProblem(409, "SLOT_UNAVAILABLE", exc.message) from exc
                raise
        elif command == "RECORD_OFFLINE_PAYMENT":
            amount = int(body.payload.get("amount_minor") or 0)
            if amount <= 0:
                raise DomainProblem(422, "INVALID_AMOUNT", "Amount must be greater than zero.")
            booking = self.db.scalar(select(Booking).where(Booking.job_card_id == job.id))
            if booking is not None:
                invoice = self.db.scalar(
                    select(Invoice).where(
                        Invoice.booking_id == booking.id, Invoice.status != "VOID"
                    )
                )
                if invoice is not None and amount > max(invoice.balance_minor, 0):
                    raise DomainProblem(
                        422,
                        "INVALID_AMOUNT",
                        "Amount cannot exceed the invoice balance due.",
                    )
            PaymentsAdminService(self.db).record_offline(
                OfflinePaymentRequest(
                    job_card_id=job.id,
                    amount_minor=amount,
                    method=str(body.payload.get("method") or "CASH"),
                    reference=str(body.payload.get("reference") or "") or None,
                    reason=reason,
                ),
                actor,
                request_id,
            )
        else:
            raise DomainProblem(422, "UNKNOWN_COMMAND", f"Unsupported override command {command}.")
        self.jobs.repo.add_event(
            job.id,
            f"OVERRIDE_{command}",
            actor_profile_id=actor.id,
            request_id=request_id,
            payload={"reason": reason, "target": body.target_status},
        )
        audit_id = self.audit.record(
            actor,
            f"override.{command}",
            "job_card",
            job.public_ref,
            reason=reason,
            before=before,
            after={"status": job.status, "client_surface": client_surface},
            request_id=request_id,
        )
        return OverrideResponse(
            job_card={
                "id": job.id,
                "public_ref": job.public_ref,
                "status": job.status,
                "version": 1,
            },
            audit_id=audit_id,
            audit_ref=audit_id,
        )
