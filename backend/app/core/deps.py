from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.common.errors import DomainProblem, problem
from app.core.auth import AuthError, decode_access_token
from app.db.models import Profile
from app.db.session import get_db


@dataclass
class CurrentUser:
    id: str
    role: str
    phone: str | None
    full_name: str | None
    phone_verified: bool
    created_at: datetime
    claims: dict


def _bearer_token(request: Request) -> str | None:
    auth = request.headers.get("Authorization")
    if not auth:
        return None
    scheme, _, token = auth.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None
    return token


def _phone_verified(claims: dict) -> bool:
    if claims.get("phone_verified") is True:
        return True
    return bool(claims.get("phone_confirmed_at"))


def _upsert_profile(db: Session, claims: dict) -> Profile:
    sub = str(claims["sub"])
    phone = claims.get("phone")
    profile = db.get(Profile, sub)
    now = datetime.now(UTC)
    if profile is None:
        profile = Profile(
            id=sub,
            phone=phone,
            role="customer",
            is_active=True,
            created_at=now,
            updated_at=now,
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    elif phone and not profile.phone:
        profile.phone = phone
        profile.updated_at = now
        db.commit()
        db.refresh(profile)
    return profile


def get_optional_user(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
) -> CurrentUser | None:
    token = _bearer_token(request)
    if not token:
        return None
    try:
        claims = decode_access_token(token)
    except AuthError:
        return None
    profile = _upsert_profile(db, claims)
    return CurrentUser(
        id=profile.id,
        role=profile.role,
        phone=profile.phone,
        full_name=profile.full_name,
        phone_verified=_phone_verified(claims),
        created_at=profile.created_at,
        claims=claims,
    )


def require_user(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
) -> CurrentUser:
    token = _bearer_token(request)
    if not token:
        raise AuthError("UNAUTHORIZED", "Valid Supabase JWT required.")
    try:
        claims = decode_access_token(token)
    except AuthError:
        raise
    profile = _upsert_profile(db, claims)
    if not profile.is_active:
        raise DomainProblem(403, "FORBIDDEN", "This account has been disabled.")
    return CurrentUser(
        id=profile.id,
        role=profile.role,
        phone=profile.phone,
        full_name=profile.full_name,
        phone_verified=_phone_verified(claims),
        created_at=profile.created_at,
        claims=claims,
    )


def require_role(*roles: str):
    def dependency(
        request: Request,
        user: Annotated[CurrentUser, Depends(require_user)],
    ) -> CurrentUser:
        if user.role not in roles:
            request_id = getattr(request.state, "request_id", None)
            raise RoleDenied(request_id)
        return user

    return dependency


class RoleDenied(Exception):
    def __init__(self, request_id: str | None) -> None:
        self.request_id = request_id
        super().__init__("Insufficient role")


def auth_error_response(request: Request, exc: AuthError):
    request_id = getattr(request.state, "request_id", None)
    return problem(401, exc.code, exc.message, request_id)


def role_denied_response(request: Request, exc: RoleDenied):
    return problem(403, "FORBIDDEN", "Insufficient role", exc.request_id)
