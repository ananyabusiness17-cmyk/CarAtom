from uuid import uuid4

from app.modules.catalog.seed import GS_SLUG
from tests.conftest import make_token, promote_admin


def _admin():
    sub = str(uuid4())
    promote_admin(sub)
    return {"Authorization": f"Bearer {make_token(sub)}"}


def test_override_without_reason_rejected(client):
    headers = _admin()
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
    job_id = created.json()["job_card"]["id"]
    response = client.post(
        f"/v1/admin/job-cards/{job_id}/override",
        headers=headers,
        json={"command": "FORCE_STATUS", "target_status": "INVOICED", "reason": ""},
    )
    assert response.status_code == 400
    assert response.json()["code"] == "REASON_REQUIRED"


def test_override_with_reason_writes_audit(client):
    headers = _admin()
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
    job_id = created.json()["job_card"]["id"]
    ref = created.json()["job_card"]["public_ref"]
    response = client.post(
        f"/v1/admin/job-cards/{job_id}/override",
        headers=headers,
        json={
            "command": "FORCE_STATUS",
            "target_status": "INVOICED",
            "reason": "Agreed condenser on WhatsApp — customer paid offline",
        },
    )
    assert response.status_code == 200
    assert response.json()["job_card"]["status"] == "COMPLETED"
    audit = client.get(f"/v1/admin/audit-logs?resource_id={ref}", headers=headers)
    assert audit.status_code == 200
    commands = [row["command"] for row in audit.json()["items"]]
    assert "override.FORCE_STATUS" in commands
    assert audit.json()["items"][0]["reason"]
