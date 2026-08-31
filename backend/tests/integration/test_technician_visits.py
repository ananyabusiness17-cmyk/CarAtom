from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.modules.visits.demo import seed_phase06
from app.modules.visits.models import Visit
from tests.conftest import TestingSessionLocal, make_token


def _seed() -> str:
    db = TestingSessionLocal()
    try:
        tech = seed_phase06(db, also_today=False)
        return tech.profile_id
    finally:
        db.close()


def _tech_headers() -> dict[str, str]:
    profile_id = _seed()
    return {"Authorization": f"Bearer {make_token(profile_id, phone='+919900011001')}"}


def _visit_id(job_card_ref: str = "JC-1042") -> str:
    db = TestingSessionLocal()
    try:
        visit = db.scalar(select(Visit).where(Visit.public_ref == "V-1042-A"))
        assert visit is not None
        return visit.id
    finally:
        db.close()


def test_list_visits_requires_technician_role(client: TestClient) -> None:
    token = make_token(str(uuid4()))
    response = client.get(
        "/v1/technician/visits?date=2026-08-19",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403
    assert response.json()["code"] == "FORBIDDEN"


def test_list_visits_for_imran(client: TestClient) -> None:
    headers = _tech_headers()
    response = client.get("/v1/technician/visits?date=2026-08-19", headers=headers)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["summary"]["total"] == 3
    refs = {row["job_card_ref"] for row in body["visits"]}
    assert "JC-1042" in refs
    first = next(row for row in body["visits"] if row["job_card_ref"] == "JC-1042")
    assert first["distance_km"] == 4.2
    assert "Inspection" in first["scheduled_label"]
    dumped = str(body)
    assert "amount_minor" not in dumped
    assert "unit_price" not in dumped


def test_detail_hides_prices(client: TestClient) -> None:
    headers = _tech_headers()
    visit_id = _visit_id()
    response = client.get(f"/v1/technician/visits/{visit_id}", headers=headers)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["job_card_ref"] == "JC-1042"
    assert body["advisor_note"]
    for line in body["scope_lines"]:
        assert "amount_minor" not in line
        assert "unit_price" not in line
    assert "Selling" not in str(body)  # disclaimer is UI-only
    assert any(tag["code"] == "APPROVED" for tag in body["tags"])


def test_en_route_transitions_assigned_to_en_route(client: TestClient) -> None:
    headers = _tech_headers()
    visit_id = _visit_id()
    response = client.post(
        f"/v1/technician/visits/{visit_id}/en-route",
        headers={**headers, "Idempotency-Key": str(uuid4())},
        json={"lat": 12.9352, "lng": 77.6245},
    )
    assert response.status_code == 200, response.text
    assert response.json()["status"] == "EN_ROUTE"


def test_idempotent_check_in(client: TestClient) -> None:
    headers = _tech_headers()
    visit_id = _visit_id()
    client.post(
        f"/v1/technician/visits/{visit_id}/en-route",
        headers={**headers, "Idempotency-Key": str(uuid4())},
    )
    key = str(uuid4())
    h = {**headers, "Idempotency-Key": key}
    body = {"lat": 12.93, "lng": 77.61}
    first = client.post(f"/v1/technician/visits/{visit_id}/check-in", headers=h, json=body)
    second = client.post(f"/v1/technician/visits/{visit_id}/check-in", headers=h, json=body)
    assert first.status_code == 200, first.text
    assert second.status_code == 200, second.text
    assert first.json()["status"] == "ON_SITE"
    assert second.json()["status"] == "ON_SITE"


def test_check_in_requires_idempotency_key(client: TestClient) -> None:
    headers = _tech_headers()
    visit_id = _visit_id()
    client.post(
        f"/v1/technician/visits/{visit_id}/en-route",
        headers={**headers, "Idempotency-Key": str(uuid4())},
    )
    response = client.post(f"/v1/technician/visits/{visit_id}/check-in", headers=headers)
    assert response.status_code == 422


def test_service_parts_qc_complete(client: TestClient) -> None:
    headers = _tech_headers()
    visit_id = _visit_id()
    assert (
        client.post(
            f"/v1/technician/visits/{visit_id}/en-route",
            headers={**headers, "Idempotency-Key": str(uuid4())},
        ).status_code
        == 200
    )
    assert (
        client.post(
            f"/v1/technician/visits/{visit_id}/check-in",
            headers={**headers, "Idempotency-Key": str(uuid4())},
            json={"lat": 12.93, "lng": 77.61},
        ).json()["status"]
        == "ON_SITE"
    )
    started = client.post(
        f"/v1/technician/visits/{visit_id}/start-service",
        headers={**headers, "Idempotency-Key": str(uuid4())},
    )
    assert started.status_code == 200, started.text
    assert started.json()["status"] == "SERVICE_IN_PROGRESS"

    parts = client.post(
        f"/v1/technician/visits/{visit_id}/parts",
        headers={**headers, "Idempotency-Key": str(uuid4())},
        json={
            "lines": [
                {"sku_code": "BP-HC-19", "label": "Brake pad set · OEM", "quantity": 1},
                {"sku_code": "BF-500", "label": "Brake fluid 500ml", "quantity": 1},
            ]
        },
    )
    assert parts.status_code == 200, parts.text
    assert parts.json()["parts_recorded"] >= 2
    assert "unit_price" not in parts.text

    labour = client.post(
        f"/v1/technician/visits/{visit_id}/labour",
        headers={**headers, "Idempotency-Key": str(uuid4())},
        json={"entries": [{"description": "Brake pad replacement", "minutes": 45}]},
    )
    assert labour.status_code == 200, labour.text

    qc = client.post(
        f"/v1/technician/visits/{visit_id}/qc",
        headers={**headers, "Idempotency-Key": str(uuid4())},
        json={
            "passed": True,
            "items": [
                {"code": "ac_vent_temp", "label": "AC vent temp OK", "passed": True},
                {"code": "no_leak", "label": "No leak at fittings", "passed": True},
                {"code": "error_codes", "label": "Error codes clear", "passed": True},
            ],
        },
    )
    assert qc.status_code == 200, qc.text
    assert qc.json()["status"] == "COMPLETED"


def test_parts_rejects_unit_price(client: TestClient) -> None:
    headers = _tech_headers()
    visit_id = _visit_id()
    client.post(
        f"/v1/technician/visits/{visit_id}/en-route",
        headers={**headers, "Idempotency-Key": str(uuid4())},
    )
    client.post(
        f"/v1/technician/visits/{visit_id}/check-in",
        headers={**headers, "Idempotency-Key": str(uuid4())},
    )
    client.post(
        f"/v1/technician/visits/{visit_id}/start-service",
        headers={**headers, "Idempotency-Key": str(uuid4())},
    )
    body = {"lines": [{"sku_code": "X", "label": "Y", "quantity": 1, "unit_price": 100}]}
    response = client.post(
        f"/v1/technician/visits/{visit_id}/parts",
        headers={**headers, "Idempotency-Key": str(uuid4())},
        json=body,
    )
    assert response.status_code == 422


def test_technician_me(client: TestClient) -> None:
    headers = _tech_headers()
    response = client.get("/v1/technician/me", headers=headers)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["display_name"] == "Imran"
    assert body["on_duty"] is True
    assert "AC" in body["skills"]
