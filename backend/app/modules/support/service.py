import logging
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from sqlalchemy.orm import Session

from app.common.errors import DomainProblem
from app.config import settings
from app.core.deps import CurrentUser
from app.core.refs import next_support_ticket_ref
from app.modules.support.models import CANCELLABLE, SupportTicket
from app.modules.support.repository import SupportTicketRepository
from app.modules.support.schemas import (
    AdminPatchSupportTicketRequest,
    CreateSupportTicketRequest,
    SupportTicketListResponse,
    SupportTicketOut,
)

ISSUE_CODES = {"FLAT_TYRE", "DEAD_BATTERY", "TOW", "OUT_OF_FUEL", "CALL_OPS", "OTHER"}
STUB_PARTNER = "Roadside partner · tyre assist"
STUB_ETA = 25
logger = logging.getLogger("caratom.support")


def _aware(value: datetime | None) -> datetime:
    if value is None:
        return datetime.now(UTC)
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


class SupportService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = SupportTicketRepository(db)

    def _actions(self, ticket: SupportTicket) -> list[str]:
        if ticket.status in CANCELLABLE:
            return ["VIEW_ACTIVE", "CANCEL"]
        if ticket.status == "DISPATCHED_STUB":
            return ["CALL_OPS", "VIEW_DISPATCHED"]
        return ["VIEW_DISPATCHED"]

    def to_out(self, ticket: SupportTicket) -> SupportTicketOut:
        return SupportTicketOut(
            id=ticket.id,
            public_ref=ticket.public_ref or "",
            status=ticket.status,
            ticket_type=ticket.ticket_type,
            issue_code=ticket.issue_code,
            issue_label=ticket.issue_label,
            location_label=ticket.location_label,
            latitude=ticket.latitude,
            longitude=ticket.longitude,
            dispatched_partner_label=ticket.dispatched_partner_label,
            eta_minutes=ticket.eta_minutes,
            allowed_actions=self._actions(ticket),
            ops_phone_e164=settings.sos_ops_phone_e164,
            created_at=_aware(ticket.created_at),
        )

    def maybe_advance_stub(self, ticket: SupportTicket) -> None:
        if ticket.status not in {"CREATED", "OPS_NOTIFIED"}:
            return
        elapsed = datetime.now(UTC) - _aware(ticket.created_at)
        notify_after = timedelta(seconds=2)
        dispatch_after = timedelta(seconds=settings.sos_stub_dispatch_seconds)
        if ticket.status == "CREATED" and elapsed >= notify_after:
            ticket.status = "OPS_NOTIFIED"
            ticket.updated_at = datetime.now(UTC)
        if elapsed >= dispatch_after:
            ticket.status = "DISPATCHED_STUB"
            ticket.dispatched_partner_label = ticket.dispatched_partner_label or STUB_PARTNER
            ticket.eta_minutes = ticket.eta_minutes or STUB_ETA
            ticket.updated_at = datetime.now(UTC)
            self.db.flush()

    def create_roadside(
        self, body: CreateSupportTicketRequest, user: CurrentUser
    ) -> SupportTicketOut:
        if body.ticket_type != "ROADSIDE":
            raise DomainProblem(422, "INVALID_TICKET_TYPE", "Only roadside tickets are supported.")
        code = body.issue_code.upper()
        if code not in ISSUE_CODES:
            raise DomainProblem(422, "INVALID_ISSUE_CODE", "Unknown roadside issue.")
        if self.repo.created_in_last_hour(user.id) >= 3:
            raise DomainProblem(
                409,
                "SOS_RATE_LIMITED",
                "Too many roadside requests. Wait before trying again.",
            )
        active = self.repo.active_roadside(user.id)
        if active is not None:
            raise DomainProblem(
                409,
                "SOS_ALREADY_ACTIVE",
                "A roadside request is already open.",
                allowed_actions=["VIEW_ACTIVE", "CANCEL"],
            )
        duplicate = self.repo.recent_duplicate(
            user.id, code, body.latitude, body.longitude, timedelta(seconds=60)
        )
        if duplicate is not None:
            return self.to_out(duplicate)

        ticket = SupportTicket(
            id=str(uuid4()),
            profile_id=user.id,
            ticket_type="ROADSIDE",
            status="CREATED",
            priority="EMERGENCY",
            issue_code=code,
            issue_label=body.issue_label,
            latitude=body.latitude,
            longitude=body.longitude,
            location_label=body.location_label,
            public_ref=next_support_ticket_ref(self.db),
        )
        self.db.add(ticket)
        self.db.flush()
        lat = round(body.latitude, 2) if body.latitude is not None else None
        lng = round(body.longitude, 2) if body.longitude is not None else None
        logger.info(
            "support_ticket_created ticket_id=%s issue_code=%s lat=%s lng=%s",
            ticket.id,
            ticket.issue_code,
            lat,
            lng,
        )
        return self.to_out(ticket)

    def get_for_customer(self, ticket_id: str, user: CurrentUser) -> SupportTicketOut:
        ticket = self.repo.get_for_customer(ticket_id, user.id)
        if ticket is None:
            raise DomainProblem(404, "NOT_FOUND", "Not found.")
        self.maybe_advance_stub(ticket)
        self.db.commit()
        return self.to_out(ticket)

    def list_mine(
        self, user: CurrentUser, cursor: str | None, limit: int
    ) -> SupportTicketListResponse:
        rows, next_cursor = self.repo.list_for_customer(user.id, cursor=cursor, limit=limit)
        return SupportTicketListResponse(
            items=[self.to_out(row) for row in rows],
            next_cursor=next_cursor,
        )

    def cancel(self, ticket_id: str, user: CurrentUser) -> SupportTicketOut:
        ticket = self.repo.get_for_customer(ticket_id, user.id)
        if ticket is None:
            raise DomainProblem(404, "NOT_FOUND", "Not found.")
        if ticket.status not in CANCELLABLE:
            raise DomainProblem(
                409,
                "TICKET_NOT_CANCELLABLE",
                "This roadside request can no longer be cancelled.",
            )
        ticket.status = "CANCELLED"
        ticket.closed_at = datetime.now(UTC)
        ticket.updated_at = datetime.now(UTC)
        self.db.flush()
        return self.to_out(ticket)

    def admin_patch(self, ticket_id: str, body: AdminPatchSupportTicketRequest) -> SupportTicketOut:
        ticket = self.repo.get(ticket_id)
        if ticket is None:
            raise DomainProblem(404, "NOT_FOUND", "Not found.")
        allowed = {"CREATED", "OPS_NOTIFIED", "DISPATCHED_STUB", "CLOSED", "CANCELLED"}
        if body.status not in allowed:
            raise DomainProblem(422, "INVALID_STATUS", "Unknown ticket status.")
        ticket.status = body.status
        if body.dispatched_partner_label is not None:
            ticket.dispatched_partner_label = body.dispatched_partner_label
        if body.eta_minutes is not None:
            ticket.eta_minutes = body.eta_minutes
        if body.status in {"CLOSED", "CANCELLED"}:
            ticket.closed_at = datetime.now(UTC)
        ticket.updated_at = datetime.now(UTC)
        self.db.flush()
        return self.to_out(ticket)
