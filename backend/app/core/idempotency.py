from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.common.errors import DomainProblem
from app.db.models import IdempotencyKey

TTL = timedelta(hours=24)


def lookup_idempotency(
    db: Session,
    key: str | None,
    route: str,
    request_hash: str | None = None,
) -> dict | None:
    if not key:
        return None
    row = db.get(IdempotencyKey, key)
    if row is None:
        return None
    expires = row.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=UTC)
    if expires < datetime.now(UTC):
        return None
    if row.route != route:
        return None
    if request_hash and row.request_hash and row.request_hash != request_hash:
        raise DomainProblem(
            409,
            "IDEMPOTENCY_CONFLICT",
            "Idempotency-Key was reused with a different request body.",
        )
    return {"status": row.response_status, "body": row.response_body}


def store_idempotency(
    db: Session,
    key: str | None,
    route: str,
    status: int,
    body: dict,
    profile_id: str | None,
    request_hash: str | None = None,
) -> None:
    if not key:
        return
    existing = db.get(IdempotencyKey, key)
    now = datetime.now(UTC)
    if existing is not None:
        existing.response_status = status
        existing.response_body = body
        existing.expires_at = now + TTL
        existing.profile_id = profile_id
        existing.route = route
        if request_hash:
            existing.request_hash = request_hash
        return
    db.add(
        IdempotencyKey(
            key=key,
            profile_id=profile_id,
            route=route,
            response_status=status,
            response_body=body,
            request_hash=request_hash,
            created_at=now,
            expires_at=now + TTL,
        )
    )
