from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest

from app.modules.notifications.models import DevicePushToken, Notification, OutboxEvent
from app.worker.jobs.outbox_dispatcher import backoff_seconds, dispatch_row, reap_stale_claims
from tests.conftest import TestingSessionLocal, make_token, promote_admin


def _auth(sub: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {make_token(sub)}"}


def test_backoff_values() -> None:
    assert backoff_seconds(1) == 30
    assert backoff_seconds(4) == 900


@pytest.mark.asyncio
async def test_internal_channel_succeeds_immediately() -> None:
    db = TestingSessionLocal()
    try:
        row = OutboxEvent(
            event_type="inspection_booked",
            payload={"job_card_id": str(uuid4())},
            channel="internal",
            status="CLAIMED",
            available_at=datetime.now(UTC),
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        await dispatch_row(db, row)
        db.commit()
        db.refresh(row)
        assert row.status == "SUCCEEDED"
    finally:
        db.close()


@pytest.mark.asyncio
async def test_push_without_token_retries() -> None:
    db = TestingSessionLocal()
    try:
        profile_id = str(uuid4())
        note = Notification(
            profile_id=profile_id,
            kind="BOOKING",
            title="Visit confirmed",
            body="Booked",
            intent="slot_confirmed",
            entity_id=str(uuid4()),
        )
        db.add(note)
        db.flush()
        row = OutboxEvent(
            event_type="slot_confirmed",
            payload={
                "profile_id": profile_id,
                "app_surface": "customer",
                "title": "Hi",
                "body": "Body",
            },
            channel="push",
            status="CLAIMED",
            available_at=datetime.now(UTC),
            notification_id=note.id,
            max_attempts=8,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        await dispatch_row(db, row)
        db.commit()
        db.refresh(row)
        assert row.status == "FAILED"
        assert row.last_error_code == "NO_DEVICE_TOKEN"
        assert row.attempt_count == 1
    finally:
        db.close()


@pytest.mark.asyncio
async def test_dead_letter_after_max_attempts() -> None:
    db = TestingSessionLocal()
    try:
        row = OutboxEvent(
            event_type="slot_confirmed",
            payload={"profile_id": str(uuid4()), "app_surface": "customer"},
            channel="push",
            status="CLAIMED",
            available_at=datetime.now(UTC),
            attempt_count=7,
            max_attempts=8,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        await dispatch_row(db, row)
        db.commit()
        db.refresh(row)
        assert row.status == "DEAD_LETTER"
    finally:
        db.close()


@pytest.mark.asyncio
async def test_stale_claim_reaped() -> None:
    db = TestingSessionLocal()
    try:
        row = OutboxEvent(
            event_type="slot_confirmed",
            payload={},
            channel="push",
            status="CLAIMED",
            claimed_at=datetime.now(UTC) - timedelta(minutes=6),
            available_at=datetime.now(UTC),
        )
        db.add(row)
        db.commit()
        count = reap_stale_claims(db)
        db.commit()
        db.refresh(row)
        assert count == 1
        assert row.status == "PENDING"
    finally:
        db.close()


@pytest.mark.asyncio
async def test_successful_push_with_token() -> None:
    db = TestingSessionLocal()
    try:
        profile_id = str(uuid4())
        db.add(
            DevicePushToken(
                profile_id=profile_id,
                app_surface="customer",
                expo_push_token="ExponentPushToken[aaaa]",
                platform="android",
            )
        )
        row = OutboxEvent(
            event_type="slot_confirmed",
            payload={
                "profile_id": profile_id,
                "app_surface": "customer",
                "title": "Hi",
                "body": "Body",
                "deep_link_path": "caratom://notifications",
            },
            channel="push",
            status="CLAIMED",
            available_at=datetime.now(UTC),
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        await dispatch_row(db, row)
        db.commit()
        db.refresh(row)
        assert row.status == "SUCCEEDED"
    finally:
        db.close()


def test_idempotent_enqueue(client) -> None:
    sub = str(uuid4())
    client.get("/v1/me", headers=_auth(sub))
    admin = str(uuid4())
    client.get("/v1/me", headers=_auth(admin))
    promote_admin(admin)
    entity = str(uuid4())
    first = client.post(
        "/v1/admin/dev/simulate-notification",
        headers=_auth(admin),
        json={"profile_id": sub, "intent": "slot_confirmed", "entity_id": entity},
    )
    assert first.status_code == 200
    second = client.post(
        "/v1/admin/dev/simulate-notification",
        headers=_auth(admin),
        json={"profile_id": sub, "intent": "slot_confirmed", "entity_id": entity},
    )
    assert second.status_code == 200
    assert first.json()["notification_id"] == second.json()["notification_id"]
    listed = client.get("/v1/me/notifications", headers=_auth(sub))
    assert listed.status_code == 200
    assert len(listed.json()["data"]) == 1
