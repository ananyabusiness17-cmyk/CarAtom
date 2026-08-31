from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.support.models import ACTIVE_ROADSIDE, SupportTicket


class SupportTicketRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, ticket_id: str) -> SupportTicket | None:
        return self.db.get(SupportTicket, ticket_id)

    def get_for_customer(self, ticket_id: str, profile_id: str) -> SupportTicket | None:
        ticket = self.get(ticket_id)
        if ticket is None or ticket.profile_id != profile_id:
            return None
        return ticket

    def active_roadside(self, profile_id: str) -> SupportTicket | None:
        return self.db.scalar(
            select(SupportTicket).where(
                SupportTicket.profile_id == profile_id,
                SupportTicket.ticket_type == "ROADSIDE",
                SupportTicket.status.in_(ACTIVE_ROADSIDE),
            )
        )

    def recent_duplicate(
        self,
        profile_id: str,
        issue_code: str,
        latitude: float | None,
        longitude: float | None,
        within: timedelta,
    ) -> SupportTicket | None:
        cutoff = datetime.now(UTC) - within
        tickets = self.db.scalars(
            select(SupportTicket)
            .where(
                SupportTicket.profile_id == profile_id,
                SupportTicket.issue_code == issue_code,
                SupportTicket.created_at >= cutoff,
            )
            .order_by(SupportTicket.created_at.desc())
        ).all()
        for ticket in tickets:
            if _coords_match(ticket.latitude, ticket.longitude, latitude, longitude):
                return ticket
        return None

    def created_in_last_hour(self, profile_id: str) -> int:
        cutoff = datetime.now(UTC) - timedelta(hours=1)
        count = self.db.scalar(
            select(func.count())
            .select_from(SupportTicket)
            .where(
                SupportTicket.profile_id == profile_id,
                SupportTicket.ticket_type == "ROADSIDE",
                SupportTicket.created_at >= cutoff,
            )
        )
        return int(count or 0)

    def list_for_customer(
        self, profile_id: str, *, cursor: str | None, limit: int
    ) -> tuple[list[SupportTicket], str | None]:
        query = (
            select(SupportTicket)
            .where(SupportTicket.profile_id == profile_id)
            .order_by(SupportTicket.created_at.desc())
            .limit(limit + 1)
        )
        if cursor:
            query = query.where(SupportTicket.created_at < datetime.fromisoformat(cursor))
        rows = list(self.db.scalars(query).all())
        next_cursor = None
        if len(rows) > limit:
            last = rows[limit - 1]
            next_cursor = last.created_at.isoformat()
            rows = rows[:limit]
        return rows, next_cursor


def _coords_match(
    a_lat: float | None,
    a_lng: float | None,
    b_lat: float | None,
    b_lng: float | None,
) -> bool:
    if a_lat is None or a_lng is None or b_lat is None or b_lng is None:
        return a_lat == b_lat and a_lng == b_lng
    return abs(a_lat - b_lat) < 1e-4 and abs(a_lng - b_lng) < 1e-4
