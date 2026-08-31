from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.modules.notifications.models import (
    AnalyticsEvent,
    DevicePushToken,
    Notification,
    OutboxEvent,
)
from app.modules.visits.models import TechnicianLocationPing


def purge_stale(db: Session, now: datetime | None = None) -> dict[str, int]:
    moment = now or datetime.now(UTC)
    ping_cut = moment - timedelta(days=90)
    n_pings = db.execute(
        delete(TechnicianLocationPing).where(TechnicianLocationPing.recorded_at < ping_cut)
    ).rowcount

    notif_cut = moment - timedelta(days=180)
    n_notif = db.execute(delete(Notification).where(Notification.created_at < notif_cut)).rowcount

    outbox_ok = moment - timedelta(days=30)
    n_out = db.execute(
        delete(OutboxEvent).where(
            OutboxEvent.status == "SUCCEEDED",
            OutboxEvent.updated_at < outbox_ok,
        )
    ).rowcount

    token_cut = moment - timedelta(days=90)
    tokens = list(
        db.scalars(
            select(DevicePushToken).where(
                DevicePushToken.revoked_at.is_(None),
                DevicePushToken.last_seen_at < token_cut,
            )
        ).all()
    )
    for token in tokens:
        token.revoked_at = moment

    analytics_cut = moment - timedelta(days=90)
    n_an = db.execute(
        delete(AnalyticsEvent).where(AnalyticsEvent.received_at < analytics_cut)
    ).rowcount

    return {
        "pings": int(n_pings or 0),
        "notifications": int(n_notif or 0),
        "outbox": int(n_out or 0),
        "tokens": len(tokens),
        "analytics": int(n_an or 0),
    }


async def run(ctx: dict) -> str:
    from app.db.session import SessionLocal

    db = SessionLocal()
    try:
        counts = purge_stale(db)
        db.commit()
        return (
            f"pings={counts['pings']} notifications={counts['notifications']} "
            f"outbox={counts['outbox']} tokens={counts['tokens']} analytics={counts['analytics']}"
        )
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
