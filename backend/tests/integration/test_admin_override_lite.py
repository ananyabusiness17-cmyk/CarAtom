from uuid import uuid4

from fastapi.testclient import TestClient

from app.modules.catalog.seed import GS_SLUG
from tests.conftest import make_token, promote_admin


def _admin() -> dict[str, str]:
    sub = str(uuid4())
    promote_admin(sub)
    return {"Authorization": f"Bearer {make_token(sub)}"}


def _job(client: TestClient) -> str:
    created = client.post(
        "/v1/job-cards",
        json={
            "service_offering_slug": GS_SLUG,
            "vehicle_context": {
                "make": "Honda",
                "model": "City",
                "year": 2019,
                "fuel_type": "PETROL",
                "transmission": "MANUAL",
            },
            "concerns": [{"text": "AC weak on idle"}],
        },
    )
    assert created.status_code in {200, 201}, created.text
    return created.json()["job_card"]["id"]


def test_override_short_reason_rejected(client: TestClient) -> None:
    headers = _admin()
    job_id = _job(client)
    empty = client.post(
        f"/v1/admin/job-cards/{job_id}/override",
        headers=headers,
        json={"action": "FORCE_STATUS", "target_status": "COMPLETED", "reason": ""},
    )
    assert empty.status_code == 400
    assert empty.json()["code"] in {"REASON_REQUIRED", "OVERRIDE_REASON_REQUIRED"}
    short = client.post(
        f"/v1/admin/job-cards/{job_id}/override",
        headers=headers,
        json={"action": "FORCE_STATUS", "target_status": "COMPLETED", "reason": "too short"},
    )
    assert short.status_code == 400
    assert short.json()["code"] == "OVERRIDE_REASON_REQUIRED"


def test_override_lite_action_alias_force_status(client: TestClient) -> None:
    headers = _admin()
    job_id = _job(client)
    response = client.post(
        f"/v1/admin/job-cards/{job_id}/override",
        headers={**headers, "Idempotency-Key": str(uuid4()), "X-Client-Surface": "admin_mobile"},
        json={
            "action": "FORCE_STATUS",
            "target_status": "INVOICED",
            "reason": "Agreed condenser on WhatsApp",
        },
    )
    assert response.status_code == 200, response.text
    assert response.json()["job_card"]["status"] == "COMPLETED"
    assert response.json()["audit_ref"] or response.json()["audit_id"]


def test_override_desk_complete_visit_alias(client: TestClient) -> None:
    headers = _admin()
    job_id = _job(client)
    response = client.post(
        f"/v1/admin/job-cards/{job_id}/override",
        headers={**headers, "Idempotency-Key": str(uuid4())},
        json={
            "action": "DESK_COMPLETE_VISIT",
            "reason": "Tech phone down, customer confirmed",
            "payload": {},
        },
    )
    assert response.status_code == 200, response.text
    assert response.json()["job_card"]["status"] == "COMPLETED"


def test_allowed_override_actions_mobile_hides_cancel_in_list(client: TestClient) -> None:
    headers = _admin()
    job_id = _job(client)
    mobile = client.get(
        f"/v1/admin/job-cards/{job_id}/allowed-override-actions",
        headers={**headers, "X-Client-Surface": "admin_mobile"},
    )
    assert mobile.status_code == 200, mobile.text
    assert "CANCEL_JOB" not in mobile.json()["actions"]
    web = client.get(f"/v1/admin/job-cards/{job_id}/allowed-override-actions", headers=headers)
    assert web.status_code == 200
    assert "CANCEL_JOB" in web.json()["actions"]
    # Header is UX-only: the command still applies if sent.
    cancel = client.post(
        f"/v1/admin/job-cards/{job_id}/override",
        headers={**headers, "Idempotency-Key": str(uuid4()), "X-Client-Surface": "admin_mobile"},
        json={"command": "CANCEL_JOB", "reason": "Customer cancelled on phone call"},
    )
    assert cancel.status_code == 200, cancel.text
    assert cancel.json()["job_card"]["status"] == "CANCELLED"
