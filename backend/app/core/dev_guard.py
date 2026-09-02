from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.common.errors import DomainProblem
from app.config import settings
from app.core.deps import CurrentUser
from app.db.models import Profile

# Stable actor for dev-only advisor estimate simulation (customer __DEV__ button).
DEV_SIMULATE_ACTOR_ID = "00000000-0000-4000-8000-000000000099"


def require_dev_environment() -> None:
    if settings.env == "development" or settings.enable_dev_simulate:
        return
    raise DomainProblem(404, "NOT_FOUND", "Not found.")


def require_dev_admin(user: CurrentUser | None) -> CurrentUser:
    require_dev_environment()
    if user is None or user.role != "admin":
        raise DomainProblem(403, "FORBIDDEN", "Admin token required.")
    return user


def dev_simulate_actor(db: Session) -> CurrentUser:
    """Internal admin actor for POST /v1/dev/.../simulate-advisor-estimate only."""
    require_dev_environment()
    profile = db.get(Profile, DEV_SIMULATE_ACTOR_ID)
    now = datetime.now(UTC)
    if profile is None:
        profile = Profile(
            id=DEV_SIMULATE_ACTOR_ID,
            phone="+919800009999",
            role="admin",
            is_active=True,
            created_at=now,
            updated_at=now,
        )
        db.add(profile)
        db.flush()
    elif profile.role != "admin":
        profile.role = "admin"
        profile.updated_at = now
        db.flush()
    return CurrentUser(
        id=profile.id,
        role=profile.role,
        phone=profile.phone,
        full_name=None,
        phone_verified=True,
        created_at=profile.created_at,
        claims={"sub": profile.id, "role": profile.role},
    )
