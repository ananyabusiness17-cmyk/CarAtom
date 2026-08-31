from collections.abc import Generator
import json
import os
from datetime import UTC, datetime, timedelta

os.environ.setdefault("ENV", "development")
os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_JWT_AUDIENCE", "authenticated")

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient
from jwt.algorithms import RSAAlgorithm
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core import auth as auth_module
from app.db.models import Base, Profile
from app.db.session import get_db
from app.main import app
from app.modules.catalog.seed import seed_catalog
from app.modules.slots.seed import seed_scheduling

_private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
_jwk = json.loads(RSAAlgorithm.to_jwk(_private_key.public_key()))
_jwk["kid"] = "test-kid"
_jwk["use"] = "sig"
_jwk["alg"] = "RS256"

ISSUER = "https://example.supabase.co/auth/v1"
AUDIENCE = "authenticated"

engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def make_token(
    sub: str,
    *,
    expired: bool = False,
    phone: str | None = "+919876543210",
    phone_verified: bool = True,
    audience: str = AUDIENCE,
    issuer: str = ISSUER,
    kid: str = "test-kid",
) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": sub,
        "aud": audience,
        "iss": issuer,
        "exp": now - timedelta(hours=1) if expired else now + timedelta(hours=1),
        "iat": now,
        "phone": phone,
        "phone_verified": phone_verified,
        "role": "authenticated",
    }
    return jwt.encode(payload, _private_key, algorithm="RS256", headers={"kid": kid})


@pytest.fixture(autouse=True)
def _jwks(monkeypatch) -> None:
    def fake_fetch(*, force: bool = False):
        return [_jwk]

    monkeypatch.setattr(auth_module, "fetch_jwks", fake_fetch)


@pytest.fixture(autouse=True)
def _db() -> Generator[None, None, None]:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        seed_catalog(db)
        seed_scheduling(db)
    finally:
        db.close()
    yield
    Base.metadata.drop_all(bind=engine)


def override_get_db() -> Generator[Session, None, None]:
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


def promote_admin(sub: str) -> None:
    db = TestingSessionLocal()
    try:
        profile = db.get(Profile, sub)
        if profile is None:
            profile = Profile(id=sub, role="admin", is_active=True, phone="+919800000001")
            db.add(profile)
        else:
            profile.role = "admin"
        db.commit()
    finally:
        db.close()


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as test_client:
        yield test_client
