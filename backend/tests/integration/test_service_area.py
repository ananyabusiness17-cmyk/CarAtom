from uuid import uuid4

from fastapi.testclient import TestClient

from tests.conftest import make_token
from tests.integration.test_general_service_e2e import FINALIZE, GS, VEHICLE


def test_invalid_postal_rejected(client: TestClient) -> None:
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
    client.post(
        f"/v1/job-cards/{job_id}/estimates/{priced['estimate']['id']}/accept",
        headers={**headers, "Idempotency-Key": "acc"},
        json={
            "expected_total_minor": 299900,
            "expected_content_hash": priced["estimate"]["content_hash"],
        },
    )
    payload = dict(FINALIZE)
    payload = {
        **FINALIZE,
        "address": {**FINALIZE["address"], "postal_code": "110001"},
    }
    response = client.post(
        f"/v1/job-cards/{job_id}/finalization",
        headers=headers,
        json=payload,
    )
    assert response.status_code == 422
    assert response.json()["code"] == "SERVICE_AREA_UNSUPPORTED"
