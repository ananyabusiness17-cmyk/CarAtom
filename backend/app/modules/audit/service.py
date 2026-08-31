from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common.errors import DomainProblem
from app.core.deps import CurrentUser
from app.db.models import Profile
from app.modules.audit.models import AuditLog


def require_reason(reason: str | None, *, command: str = "") -> str:
    cleaned = (reason or "").strip()
    if not cleaned:
        raise DomainProblem(400, "REASON_REQUIRED", "A reason is required for this command.")
    if command.startswith("override.") and len(cleaned) < 10:
        raise DomainProblem(
            400,
            "OVERRIDE_REASON_REQUIRED",
            "Override reason must be at least 10 characters.",
        )
    return cleaned


class AuditService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def record(
        self,
        actor: CurrentUser,
        command: str,
        resource_type: str,
        resource_id: str,
        *,
        reason: str | None = None,
        before: dict | None = None,
        after: dict | None = None,
        request_id: str | None = None,
    ) -> str:
        row = AuditLog(
            actor_id=actor.id,
            actor_role=actor.role,
            command=command,
            resource_type=resource_type,
            resource_id=resource_id,
            before_summary=before,
            after_summary=after,
            reason=reason,
            request_id=request_id,
        )
        self.db.add(row)
        self.db.flush()
        return row.id

    def list(
        self,
        *,
        resource_type: str | None = None,
        resource_id: str | None = None,
        actor_id: str | None = None,
        command: str | None = None,
        cursor: str | None = None,
        limit: int = 50,
    ) -> tuple[list[AuditLog], str | None]:
        query = select(AuditLog).order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
        if resource_type:
            query = query.where(AuditLog.resource_type == resource_type)
        if resource_id:
            query = query.where(AuditLog.resource_id == resource_id)
        if actor_id:
            query = query.where(AuditLog.actor_id == actor_id)
        if command:
            query = query.where(AuditLog.command == command)
        if cursor:
            created, row_id = _decode_cursor(cursor)
            query = query.where(
                (AuditLog.created_at < created)
                | ((AuditLog.created_at == created) & (AuditLog.id < row_id))
            )
        rows = list(self.db.scalars(query.limit(limit + 1)).all())
        next_cursor = None
        if len(rows) > limit:
            last = rows[limit - 1]
            next_cursor = f"{last.created_at.isoformat()}|{last.id}"
            rows = rows[:limit]
        return rows, next_cursor

    def actor_name(self, actor_id: str) -> str:
        profile = self.db.get(Profile, actor_id)
        if profile is None:
            return "Unknown"
        return profile.full_name or profile.phone or "Admin"


def _decode_cursor(cursor: str) -> tuple[datetime, str]:
    created_raw, _, row_id = cursor.partition("|")
    created = datetime.fromisoformat(created_raw)
    if created.tzinfo is None:
        created = created.replace(tzinfo=UTC)
    return created, row_id
