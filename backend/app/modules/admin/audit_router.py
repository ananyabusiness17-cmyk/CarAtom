from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_role
from app.db.session import get_db
from app.modules.admin.schemas import AuditLogListResponse, AuditLogRowOut
from app.modules.audit.service import AuditService

router = APIRouter(tags=["admin-audit"])


@router.get("/audit-logs", response_model=AuditLogListResponse)
def list_audit_logs(
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[CurrentUser, Depends(require_role("admin"))],
    resource_type: str | None = None,
    resource_id: str | None = None,
    actor_id: str | None = None,
    command: str | None = None,
    cursor: str | None = None,
) -> AuditLogListResponse:
    service = AuditService(db)
    rows, next_cursor = service.list(
        resource_type=resource_type,
        resource_id=resource_id,
        actor_id=actor_id,
        command=command,
        cursor=cursor,
    )
    return AuditLogListResponse(
        items=[
            AuditLogRowOut(
                id=row.id,
                created_at=row.created_at,
                actor_display_name=service.actor_name(row.actor_id),
                actor_role=row.actor_role,
                command=row.command,
                resource_type=row.resource_type,
                resource_id=row.resource_id,
                reason=row.reason,
                request_id=row.request_id,
                before_summary=row.before_summary,
                after_summary=row.after_summary,
            )
            for row in rows
        ],
        next_cursor=next_cursor,
    )
