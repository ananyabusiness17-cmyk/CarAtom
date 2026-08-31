from datetime import UTC, datetime

from fastapi import APIRouter

from app.config import settings
from app.db.session import check_database, check_redis
from app.modules.health.schemas import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse, summary="Process and database health")
def get_health() -> dict[str, str]:
    database = "ok" if check_database() else "unavailable"
    redis = "ok" if check_redis() else "unavailable"
    timestamp = datetime.now(UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    return {
        "status": "ok",
        "environment": settings.env,
        "database": database,
        "redis": redis,
        "version": settings.api_version,
        "timestamp": timestamp,
    }
