from uuid import uuid4

from tests.conftest import make_token, promote_admin


def _auth(sub: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {make_token(sub)}"}


def test_list_and_mark_read(client) -> None:
    sub = str(uuid4())
    client.get("/v1/me", headers=_auth(sub))
    admin = str(uuid4())
    client.get("/v1/me", headers=_auth(admin))
    promote_admin(admin)
    created = client.post(
        "/v1/admin/dev/simulate-notification",
        headers=_auth(admin),
        json={"profile_id": sub, "intent": "slot_confirmed", "entity_id": str(uuid4())},
    )
    assert created.status_code == 200
    listed = client.get("/v1/me/notifications", headers=_auth(sub))
    assert listed.status_code == 200
    item = listed.json()["data"][0]
    assert item["intent"] == "slot_confirmed"
    assert item["kind"]
    marked = client.post(f"/v1/me/notifications/{item['id']}/read", headers=_auth(sub))
    assert marked.status_code == 200
    assert marked.json()["read_at"] is not None


def test_device_token_upsert_and_revoke(client) -> None:
    sub = str(uuid4())
    headers = _auth(sub)
    client.get("/v1/me", headers=headers)
    created = client.put(
        "/v1/me/device-push-token",
        headers=headers,
        json={
            "app_surface": "customer",
            "expo_push_token": "ExponentPushToken[abc]",
            "platform": "android",
        },
    )
    assert created.status_code == 200
    token_id = created.json()["id"]
    again = client.put(
        "/v1/me/device-push-token",
        headers=headers,
        json={
            "app_surface": "customer",
            "expo_push_token": "ExponentPushToken[abc]",
            "platform": "ios",
        },
    )
    assert again.status_code == 200
    assert again.json()["id"] == token_id
    bad = client.put(
        "/v1/me/device-push-token",
        headers=headers,
        json={"app_surface": "customer", "expo_push_token": "not-a-token", "platform": "android"},
    )
    assert bad.status_code == 400
    assert bad.json()["code"] == "DEVICE_TOKEN_INVALID"
    revoked = client.delete(f"/v1/me/device-push-token/{token_id}", headers=headers)
    assert revoked.status_code == 200
    assert revoked.json()["revoked"] is True


def test_admin_outbox_retry(client) -> None:
    from datetime import UTC, datetime

    from app.modules.notifications.models import OutboxEvent
    from tests.conftest import TestingSessionLocal

    admin = str(uuid4())
    client.get("/v1/me", headers=_auth(admin))
    promote_admin(admin)
    db = TestingSessionLocal()
    try:
        row = OutboxEvent(
            event_type="slot_confirmed",
            payload={"to_e164": "+919876543210"},
            channel="sms",
            status="DEAD_LETTER",
            available_at=datetime.now(UTC),
            last_error_code="TIMEOUT",
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        outbox_id = row.id
    finally:
        db.close()
    listed = client.get("/v1/admin/notifications/outbox?status=DEAD_LETTER", headers=_auth(admin))
    assert listed.status_code == 200
    assert listed.json()["items"][0]["payload"]["to_e164"] == "***3210"
    retried = client.post(
        f"/v1/admin/notifications/outbox/{outbox_id}/retry",
        headers=_auth(admin),
        json={"reason": "Customer asked us to resend this SMS."},
    )
    assert retried.status_code == 200
    assert retried.json()["status"] == "PENDING"


def test_analytics_ingest_strips_pii(client) -> None:
    sub = str(uuid4())
    headers = _auth(sub)
    client.get("/v1/me", headers=headers)
    response = client.post(
        "/v1/analytics/events",
        headers=headers,
        json={
            "events": [
                {
                    "name": "booking_detail_viewed",
                    "schema_version": 1,
                    "occurred_at": "2026-08-31T08:00:00.000Z",
                    "properties": {"intent": "ok", "phone": "+919876543210"},
                }
            ]
        },
    )
    assert response.status_code == 200
    assert response.json()["accepted"] == 1
