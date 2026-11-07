from __future__ import annotations

import time
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
import jwt
from jwt import PyJWK

from app.config import settings

DEV_LOCAL_KID = "caratom-dev-local"
DEV_LOCAL_ISS = "caratom-dev-local"
_DEV_LOCAL_SECRET_FALLBACK = "caratom-dev-local-not-for-production"

_jwks_cache: dict[str, Any] = {"keys": [], "fetched_at": 0.0}
_JWKS_TTL_SECONDS = 3600


class AuthError(Exception):
    def __init__(self, code: str, message: str) -> None:
        self.code = code
        self.message = message
        super().__init__(message)


def _issuer() -> str:
    return f"{settings.supabase_url.rstrip('/')}/auth/v1"


def _jwks_url() -> str:
    return f"{_issuer()}/.well-known/jwks.json"


def fetch_jwks(*, force: bool = False) -> list[dict[str, Any]]:
    now = time.time()
    if not force and _jwks_cache["keys"] and now - _jwks_cache["fetched_at"] < _JWKS_TTL_SECONDS:
        return _jwks_cache["keys"]
    if not settings.supabase_url:
        raise AuthError("UNAUTHORIZED", "Valid Supabase JWT required.")
    response = httpx.get(_jwks_url(), timeout=10.0)
    response.raise_for_status()
    payload = response.json()
    keys = payload.get("keys") or []
    _jwks_cache["keys"] = keys
    _jwks_cache["fetched_at"] = now
    return keys


def _key_for_kid(kid: str | None) -> dict[str, Any] | None:
    keys = fetch_jwks()
    for key in keys:
        if kid is None or key.get("kid") == kid:
            return key
    keys = fetch_jwks(force=True)
    for key in keys:
        if kid is None or key.get("kid") == kid:
            return key
    return None


def _development_only() -> bool:
    return settings.env.lower() == "development"


def _dev_local_secret() -> str:
    return settings.dev_local_jwt_secret or _DEV_LOCAL_SECRET_FALLBACK


def encode_dev_local_token(*, sub: str, phone: str) -> str:
    if not _development_only():
        raise AuthError("UNAUTHORIZED", "Valid Supabase JWT required.")
    now = datetime.now(UTC)
    payload = {
        "sub": sub,
        "aud": settings.supabase_jwt_audience,
        "iss": DEV_LOCAL_ISS,
        "exp": now + timedelta(hours=12),
        "iat": now,
        "phone": phone,
        "phone_verified": True,
        "role": "authenticated",
    }
    return jwt.encode(
        payload,
        _dev_local_secret(),
        algorithm="HS256",
        headers={"kid": DEV_LOCAL_KID},
    )


def _decode_dev_local_token(token: str) -> dict[str, Any]:
    if not _development_only():
        raise AuthError("INVALID_TOKEN", "Valid Supabase JWT required.")
    try:
        claims = jwt.decode(
            token,
            _dev_local_secret(),
            algorithms=["HS256"],
            audience=settings.supabase_jwt_audience,
            issuer=DEV_LOCAL_ISS,
            options={"require": ["exp", "sub"]},
        )
    except jwt.InvalidTokenError as exc:
        raise AuthError("INVALID_TOKEN", "Valid Supabase JWT required.") from exc
    if not claims.get("sub"):
        raise AuthError("INVALID_TOKEN", "Valid Supabase JWT required.")
    return claims


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        header = jwt.get_unverified_header(token)
    except jwt.InvalidTokenError as exc:
        raise AuthError("INVALID_TOKEN", "Valid Supabase JWT required.") from exc

    if header.get("kid") == DEV_LOCAL_KID:
        return _decode_dev_local_token(token)

    jwk = _key_for_kid(header.get("kid"))
    if not jwk:
        raise AuthError("INVALID_TOKEN", "Valid Supabase JWT required.")

    try:
        public_key = PyJWK.from_dict(jwk).key
        algorithm = jwk.get("alg") or ("ES256" if jwk.get("kty") == "EC" else "RS256")
        claims = jwt.decode(
            token,
            public_key,
            algorithms=[algorithm, "RS256", "ES256"],
            audience=settings.supabase_jwt_audience,
            issuer=_issuer(),
            options={"require": ["exp", "sub"]},
        )
    except jwt.ExpiredSignatureError as exc:
        raise AuthError("INVALID_TOKEN", "Valid Supabase JWT required.") from exc
    except jwt.InvalidTokenError as exc:
        raise AuthError("INVALID_TOKEN", "Valid Supabase JWT required.") from exc

    sub = claims.get("sub")
    if not sub:
        raise AuthError("INVALID_TOKEN", "Valid Supabase JWT required.")
    return claims


def reset_jwks_cache() -> None:
    _jwks_cache["keys"] = []
    _jwks_cache["fetched_at"] = 0.0
