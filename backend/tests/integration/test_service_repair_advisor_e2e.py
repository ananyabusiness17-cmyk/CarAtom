from datetime import date, timedelta
from uuid import uuid4

from fastapi.testclient import TestClient

from tests.conftest import make_token, promote_admin

GS = "general-service-health-report"
VEHICLE = {
    "make": "Honda",
    "model": "City",
    "year": 2019,
    "fuel_type": "PETROL",
    "transmission": "MANUAL",
}
FINALIZE = {
    "customer": {"full_name": "Rajesh Kumar", "phone_e164": "+919876543210"},
    "address": {
        "line1": "12, 5th Cross, Koramangala 5th Block",
        "locality": "Koramangala 5th Block",
        "city": "Bengaluru",
        "postal_code": "560034",
        "latitude": 12.9352,
        "longitude": 77.6245,
    },
    "vehicle": VEHICLE,
    "save_vehicle": True,
    "save_address": True,
}


def _auth(sub: str | None = None) -> tuple[str, dict[str, str]]:
    user_id = sub or str(uuid4())
    return user_id, {"Authorization": f"Bearer {make_token(user_id)}"}


def _slot_window() -> tuple[str, str]:
    start = date.today() + timedelta(days=1)
    end = start + timedelta(days=6)
    return start.isoformat(), end.isoformat()


def _create_with_repairs(client: TestClient, headers: dict[str, str]) -> str:
    created = client.post(
        "/v1/job-cards",
        headers=headers,
        json={
            "service_offering_slug": GS,
            "vehicle_context": VEHICLE,
            "concerns": [{"text": "AC weak · brakes soft"}],
        },
    )
    assert created.status_code == 201, created.text
    job_id = created.json()["job_card"]["id"]
    for slug in ("ac-gas-refill", "brake-pads-pair"):
        added = client.post(
            f"/v1/job-cards/{job_id}/items",
            headers=headers,
            json={"kind": "REPAIR", "repair_offering_slug": slug, "quantity": 1},
        )
        assert added.status_code == 201, added.text
    return job_id


def _price_and_accept_v1(client: TestClient, headers: dict[str, str], job_id: str) -> str:
    priced = client.post(f"/v1/job-cards/{job_id}/price", headers=headers)
    assert priced.status_code == 200, priced.text
    assert priced.json()["estimate"]["total"]["amount_minor"] == 599900
    assert priced.json()["flow_decision"]["advisor_requirement"] == "REQUIRED_NOW"
    estimate_id = priced.json()["estimate"]["id"]
    content_hash = priced.json()["estimate"]["content_hash"]
    accepted = client.post(
        f"/v1/job-cards/{job_id}/estimates/{estimate_id}/accept",
        headers={**headers, "Idempotency-Key": f"accept-v1-{job_id}"},
        json={"expected_total_minor": 599900, "expected_content_hash": content_hash},
    )
    assert accepted.status_code == 200, accepted.text
    assert accepted.json()["flow_decision"]["required_next_action"] == "CREATE_ADVISOR_CASE"
    return estimate_id


def test_service_repair_advisor_e2e(client: TestClient) -> None:
    user_id, headers = _auth()
    job_id = _create_with_repairs(client, headers)
    _price_and_accept_v1(client, headers, job_id)

    guest_case = client.post(f"/v1/job-cards/{job_id}/advisor-case")
    assert guest_case.status_code == 401

    created_case = client.post(
        f"/v1/job-cards/{job_id}/advisor-case",
        headers={**headers, "Idempotency-Key": f"case-{job_id}"},
    )
    assert created_case.status_code == 200, created_case.text
    assert created_case.json()["flow_decision"]["required_next_action"] == "WAIT_FOR_ADVISOR"
    assert created_case.json()["advisor_case"]["advisor_display_name"] == "Priya"
    case_id = created_case.json()["advisor_case"]["id"]

    again = client.post(
        f"/v1/job-cards/{job_id}/advisor-case",
        headers={**headers, "Idempotency-Key": f"case-2-{job_id}"},
    )
    assert again.status_code == 200
    assert again.json()["advisor_case"]["id"] == case_id

    simulated = client.post(
        f"/v1/dev/job-cards/{job_id}/simulate-advisor-estimate",
        headers=headers,
    )
    assert simulated.status_code == 200, simulated.text
    assert simulated.json()["estimate"]["total"]["amount_minor"] == 684900
    v2 = simulated.json()["estimate"]
    assert simulated.json()["flow_decision"]["required_next_action"] == "ACCEPT_REVISED_ESTIMATE"

    polled = client.get(f"/v1/job-cards/{job_id}/advisor-case", headers=headers)
    assert polled.status_code == 200
    assert polled.json()["advisor_case"]["status"] == "CUSTOMER_CONFIRMATION_DUE"
    assert "notes" not in polled.json()["advisor_case"]
    assert polled.json()["advisor_case"]["pending_estimate_id"] == v2["id"]

    repriced = client.post(f"/v1/job-cards/{job_id}/price", headers=headers)
    assert repriced.status_code == 409
    assert "ACCEPT_REVISED_ESTIMATE" in repriced.json()["allowed_actions"]

    accepted_v2 = client.post(
        f"/v1/job-cards/{job_id}/estimates/{v2['id']}/accept",
        headers={**headers, "Idempotency-Key": f"accept-v2-{job_id}"},
        json={"expected_total_minor": 684900, "expected_content_hash": v2["content_hash"]},
    )
    assert accepted_v2.status_code == 200, accepted_v2.text
    assert accepted_v2.json()["flow_decision"]["required_next_action"] == "FINALIZE"
    assert accepted_v2.json()["flow_decision"]["advisor_requirement"] == "NOT_REQUIRED"

    finalized = client.post(
        f"/v1/job-cards/{job_id}/finalization",
        headers={**headers, "Idempotency-Key": f"fin-{job_id}"},
        json=FINALIZE,
    )
    assert finalized.status_code == 200, finalized.text

    slot_from, slot_to = _slot_window()
    slots = client.get(
        f"/v1/job-cards/{job_id}/slots",
        headers=headers,
        params={"from": slot_from, "to": slot_to},
    )
    available = [row for row in slots.json()["slots"] if row["available"]]
    target = available[0]
    held = client.post(
        f"/v1/job-cards/{job_id}/slot-holds",
        headers={**headers, "Idempotency-Key": f"hold-{job_id}"},
        json={"slot_id": target["slot_id"]},
    )
    booked = client.post(
        f"/v1/job-cards/{job_id}/book",
        headers={**headers, "Idempotency-Key": f"book-{job_id}"},
        json={"slot_hold_id": held.json()["hold"]["id"]},
    )
    assert booked.status_code == 201, booked.text
    assert booked.json()["booking"]["job_card_ref"].startswith("JC-")


def test_accept_revised_while_advisor_in_progress(client: TestClient) -> None:
    _user_id, headers = _auth()
    job_id = _create_with_repairs(client, headers)
    _price_and_accept_v1(client, headers, job_id)
    client.post(
        f"/v1/job-cards/{job_id}/advisor-case",
        headers={**headers, "Idempotency-Key": f"case-{job_id}"},
    )
    simulated = client.post(
        f"/v1/dev/job-cards/{job_id}/simulate-advisor-estimate",
        headers=headers,
    )
    assert simulated.status_code == 200, simulated.text
    v2 = simulated.json()["estimate"]

    from app.modules.job_cards.models import JobCard
    from tests.conftest import TestingSessionLocal

    with TestingSessionLocal() as db:
        job = db.get(JobCard, job_id)
        assert job is not None
        job.status = "ADVISOR_IN_PROGRESS"
        db.commit()

    accepted = client.post(
        f"/v1/job-cards/{job_id}/estimates/{v2['id']}/accept",
        headers={**headers, "Idempotency-Key": f"accept-v2-legacy-{job_id}"},
        json={"expected_total_minor": 684900, "expected_content_hash": v2["content_hash"]},
    )
    assert accepted.status_code == 200, accepted.text
    assert accepted.json()["flow_decision"]["required_next_action"] == "FINALIZE"


def test_advisor_deny_loop(client: TestClient) -> None:
    _user_id, headers = _auth()
    job_id = _create_with_repairs(client, headers)
    _price_and_accept_v1(client, headers, job_id)
    client.post(
        f"/v1/job-cards/{job_id}/advisor-case",
        headers={**headers, "Idempotency-Key": f"case-{job_id}"},
    )
    simulated = client.post(
        f"/v1/dev/job-cards/{job_id}/simulate-advisor-estimate",
        headers=headers,
    )
    assert simulated.status_code == 200, simulated.text
    v2_id = simulated.json()["estimate"]["id"]
    denied = client.post(
        f"/v1/job-cards/{job_id}/estimates/{v2_id}/reject",
        headers={**headers, "Idempotency-Key": f"reject-{job_id}"},
    )
    assert denied.status_code == 200, denied.text
    assert denied.json()["job_card"]["status"] == "EDITABLE"
    assert denied.json()["flow_decision"]["required_next_action"] == "EDIT_JOB_CARD"

    brake = next(
        item
        for item in denied.json()["job_card"]["items"]
        if item.get("repair_offering_slug") == "brake-pads-pair"
    )
    removed = client.delete(f"/v1/job-cards/{job_id}/items/{brake['id']}", headers=headers)
    assert removed.status_code == 200, removed.text
    slugs = {item.get("repair_offering_slug") for item in removed.json()["job_card"]["items"]}
    assert "brake-pads-pair" not in slugs
    assert "ac-gas-refill" in slugs


def test_admin_estimate_publish(client: TestClient) -> None:
    user_id, headers = _auth()
    job_id = _create_with_repairs(client, headers)
    _price_and_accept_v1(client, headers, job_id)
    case = client.post(
        f"/v1/job-cards/{job_id}/advisor-case",
        headers={**headers, "Idempotency-Key": f"case-{job_id}"},
    )
    case_id = case.json()["advisor_case"]["id"]

    customer_inbox = client.get("/v1/admin/advisor-cases", headers=headers)
    assert customer_inbox.status_code == 403

    admin_id = str(uuid4())
    promote_admin(admin_id)
    # Ensure profile exists via a request then promote (JWT upserts customer first).
    admin_headers = {"Authorization": f"Bearer {make_token(admin_id)}"}
    client.get("/v1/me", headers=admin_headers)
    promote_admin(admin_id)

    inbox = client.get("/v1/admin/advisor-cases", headers=admin_headers)
    assert inbox.status_code == 200, inbox.text
    assert any(row["job_card_id"] == job_id for row in inbox.json()["items"])
    masked = inbox.json()["items"][0]["masked_phone"]
    if masked:
        assert "***" in masked

    detail = client.get(f"/v1/admin/job-cards/{job_id}", headers=admin_headers)
    assert detail.status_code == 200, detail.text
    assert detail.json()["advisor_case_id"] == case_id

    published = client.post(
        f"/v1/admin/job-cards/{job_id}/estimate",
        headers={**admin_headers, "Idempotency-Key": f"pub-{job_id}"},
        json={
            "advisor_case_id": case_id,
            "publish_to_customer": True,
            "revision_notes_customer_safe": "Brake pads upgraded; fluid flush added on call.",
            "lines": [
                {
                    "kind": "SERVICE",
                    "label": "General servicing + health report",
                    "amount_minor": 299900,
                },
                {
                    "kind": "REPAIR",
                    "repair_offering_slug": "ac-gas-refill",
                    "amount_minor": 120000,
                },
                {
                    "kind": "REPAIR",
                    "repair_offering_slug": "brake-pads-pair",
                    "amount_minor": 220000,
                },
                {"kind": "REPAIR", "label": "Brake fluid flush", "amount_minor": 45000},
            ],
        },
    )
    assert published.status_code == 200, published.text
    assert published.json()["estimate"]["total"]["amount_minor"] == 684900

    pending = client.get(f"/v1/job-cards/{job_id}/advisor-case", headers=headers)
    assert pending.json()["advisor_case"]["status"] == "CUSTOMER_CONFIRMATION_DUE"


def test_dev_simulate_hidden_in_production(client: TestClient, monkeypatch) -> None:
    from app.config import settings

    monkeypatch.setattr(settings, "env", "production")
    monkeypatch.setattr(settings, "enable_dev_simulate", False)
    response = client.post(f"/v1/dev/job-cards/{uuid4()}/simulate-advisor-estimate")
    assert response.status_code == 404


def test_dev_simulate_allowed_in_production_when_flag_set(
    client: TestClient, monkeypatch
) -> None:
    from app.config import settings

    monkeypatch.setattr(settings, "env", "production")
    monkeypatch.setattr(settings, "enable_dev_simulate", True)
    response = client.post(f"/v1/dev/job-cards/{uuid4()}/simulate-advisor-estimate")
    assert response.status_code == 404
    assert response.json()["code"] == "NOT_FOUND"
