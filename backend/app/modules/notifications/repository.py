from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.notifications.models import Notification


def _split_cursor(cursor: str) -> tuple[datetime, str | None, str]:
    if "|" in cursor:
        created_raw, row_id = cursor.split("|", 1)
        return datetime.fromisoformat(created_raw), None, row_id
    return datetime.fromisoformat(cursor), None, "zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz"


class NotificationRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, notification_id: str) -> Notification | None:
        return self.db.get(Notification, notification_id)

    def list_for_profile(
        self, profile_id: str, *, cursor: str | None, limit: int
    ) -> tuple[list[Notification], str | None]:
        query = (
            select(Notification)
            .where(Notification.profile_id == profile_id)
            .order_by(Notification.created_at.desc(), Notification.id.desc())
            .limit(limit + 1)
        )
        if cursor:
            created, _, row_id = _split_cursor(cursor)
            query = query.where(
                (Notification.created_at < created)
                | ((Notification.created_at == created) & (Notification.id < row_id))
            )
        rows = list(self.db.scalars(query).all())
        next_cursor = None
        if len(rows) > limit:
            last = rows[limit - 1]
            next_cursor = f"{last.created_at.isoformat()}|{last.id}"
            rows = rows[:limit]
        return rows, next_cursor

    def unread_count(self, profile_id: str) -> int:
        count = self.db.scalar(
            select(func.count())
            .select_from(Notification)
            .where(Notification.profile_id == profile_id, Notification.read_at.is_(None))
        )
        return int(count or 0)

    def add(self, notification: Notification) -> Notification:
        self.db.add(notification)
        self.db.flush()
        return notification

    def mark_read(self, notification: Notification) -> Notification:
        if notification.read_at is None:
            notification.read_at = datetime.now(UTC)
        return notification

    def mark_all_read(self, profile_id: str) -> int:
        rows = list(
            self.db.scalars(
                select(Notification).where(
                    Notification.profile_id == profile_id, Notification.read_at.is_(None)
                )
            ).all()
        )
        now = datetime.now(UTC)
        for row in rows:
            row.read_at = now
        return len(rows)
