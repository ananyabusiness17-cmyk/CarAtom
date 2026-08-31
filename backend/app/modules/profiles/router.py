from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_role, require_user
from app.db.models import Profile
from app.db.session import get_db
from app.modules.profiles.schemas import MeResponse, ProfilePatchRequest

router = APIRouter()


def _to_me(user: CurrentUser) -> MeResponse:
    created = user.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=UTC)
    return MeResponse(
        id=user.id,
        phone=user.phone,
        full_name=user.full_name,
        role=user.role,
        phone_verified=user.phone_verified,
        created_at=created,
    )


@router.get("/me", response_model=MeResponse, summary="Current authenticated profile")
def get_me(user: Annotated[CurrentUser, Depends(require_user)]) -> MeResponse:
    return _to_me(user)


@router.patch("/me", response_model=MeResponse, summary="Update own profile")
def patch_me(
    body: ProfilePatchRequest,
    user: Annotated[CurrentUser, Depends(require_user)],
    db: Annotated[Session, Depends(get_db)],
) -> MeResponse:
    profile = db.get(Profile, user.id)
    assert profile is not None
    profile.full_name = body.full_name
    profile.updated_at = datetime.now(UTC)
    db.commit()
    db.refresh(profile)
    user.full_name = profile.full_name
    return _to_me(user)


admin_router = APIRouter()


@admin_router.get("/ping", summary="Admin role probe")
def admin_ping(_user: Annotated[CurrentUser, Depends(require_role("admin"))]) -> dict[str, str]:
    return {"status": "ok"}
