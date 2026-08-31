from app.common.errors import DomainProblem
from app.config import settings
from app.core.deps import CurrentUser


def require_dev_environment() -> None:
    if settings.env == "production":
        raise DomainProblem(404, "NOT_FOUND", "Not found.")
    if settings.env != "development" and not settings.enable_dev_simulate:
        raise DomainProblem(404, "NOT_FOUND", "Not found.")


def require_dev_admin(user: CurrentUser | None) -> CurrentUser:
    require_dev_environment()
    if user is None or user.role != "admin":
        raise DomainProblem(403, "FORBIDDEN", "Admin token required.")
    return user
