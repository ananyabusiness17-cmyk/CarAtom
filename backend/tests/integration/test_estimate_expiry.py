from datetime import UTC, datetime, timedelta
from uuid import uuid4

from fastapi.testclient import TestClient

from tests.conftest import make_token
from tests.integration.test_general_service_e2e import GS, VEHICLE


def test_accept_after_expiry(client: TestClient) -> None:
    headers = {"Authorization": f"Bearer {make_token(str(uuid4()))}"}
    created = client.post(
        "/v1/job-cards",
        headers=headers,
        json={
            "service_offering_slug": GS,
            "vehicle_context": VEHICLE,
            "concerns": [{"text": "Demo"}],
        },
    )
    job_id = created.json()["job_card"]["id"]
    priced = client.post(f"/v1/job-cards/{job_id}/price", headers=headers).json()
    estimate_id = priced["estimate"]["id"]

    from app.modules.estimates.models import Estimate
    from tests.conftest import TestingSessionLocal

    db = TestingSessionLocal()
    try:
        row = db.get(Estimate, estimate_id)
        assert row is not None
        row.expires_at = datetime.now(UTC) - timedelta(minutes=1)
        db.commit()
    finally:
        db.close()

    accepted = client.post(
        f"/v1/job-cards/{job_id}/estimates/{estimate_id}/accept",
        headers={**headers, "Idempotency-Key": "expired"},
        json={
            "expected_total_minor": 299900,
            "expected_content_hash": priced["estimate"]["content_hash"],
        },
    )
    assert accepted.status_code == 409
    assert accepted.json()["code"] == "ESTIMATE_EXPIRED"
    assert "REQUEST_ESTIMATE" in accepted.json()["allowed_actions"]
