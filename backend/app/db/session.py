from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings

engine_kwargs: dict = {"pool_pre_ping": True}
if settings.database_url.startswith("postgresql"):
    engine_kwargs["pool_size"] = 5
    engine_kwargs["max_overflow"] = 10

engine = create_engine(settings.database_url, **engine_kwargs)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, class_=Session)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_database() -> bool:
    try:
        with engine.connect() as conn:
            conn.exec_driver_sql("SELECT 1")
        return True
    except Exception:
        return False


def check_redis() -> bool:
    """TCP reachability only — never return the hostname in API responses."""
    import socket
    from urllib.parse import urlparse

    parsed = urlparse(settings.redis_url)
    host = parsed.hostname
    port = parsed.port or 6379
    if not host:
        return False
    try:
        with socket.create_connection((host, port), timeout=1.0):
            return True
    except OSError:
        return False
