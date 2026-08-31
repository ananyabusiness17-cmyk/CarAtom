from datetime import date, timedelta
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.modules.visits.demo import seed_phase06
from app.modules.visits.models import Visit
from tests.conftest import TestingSessionLocal, make_token, promote_admin

IR = "inspection-and-repair"
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
FINDINGS = {
    "summary": "Front brake wear and rotor runout detected.",
    "recommendation": "Replace front brake pads and resurface rotors",
    "findings": [
        {
            "title": "Front brake pads worn",
            "severity": "HIGH",
            "customer_explanation": "Pads below safe thickness on front left.",
            "recommendation": "Replace front brake pads and resurface rotors",
            "repair_category": "brakes",
        },
        {
            "title": "Steering vibration",
            "severity": "MEDIUM",
            "customer_explanation": "Vibration likely linked to front wheel assembly.",
        },
    ],
    "recommended_parts": [
        {"sku_code": "front-brake-pad-set", "label": "Front brake pad set", "quantity": 1},
        {"sku_code": "front-brake-rotors-pair", "label": "Front brake rotors", "quantity": 1},
    ],
    "recommended_labour": [{"description": "Brake service labour", "minutes": 90}],
}


def _auth(sub: str | None = None) -> dict[str, str]:
    return {"Authorization": f"Bearer {make_token(sub or str(uuid4()))}"}


def _slot_window() -> tuple[str, str]:
    start = date.today() + timedelta(days=1)
    end = start + timedelta(days=6)
    return start.isoformat(), end.isoformat()


def _create_and_book_inspection(client: TestClient, headers: dict[str, str]) -> tuple[str, str]:
    created = client.post(
        "/v1/job-cards",
        headers=headers,
        json={
            "service_offering_slug": IR,
            "vehicle_context": VEHICLE,
            "concerns": [{"text": "Brake noise from front left. Steering vibration at low speed."}],
        },
    )
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["flow_decision"]["policy"] == "INSPECTION_REPAIR"
    assert body["flow_decision"]["estimate_requirement"] == "POST_INSPECTION"
    assert "CREATE_ADVISOR_CASE" not in body["flow_decision"]["allowed_actions"]
    job_id = body["job_card"]["id"]

    finalized = client.post(
        f"/v1/job-cards/{job_id}/finalization",
        headers={**headers, "Idempotency-Key": "ir-fin-1"},
        json=FINALIZE,
    )
    assert finalized.status_code == 200, finalized.text
    assert finalized.json()["flow_decision"]["required_next_action"] == "SELECT_SLOT"

    slot_from, slot_to = _slot_window()
    slots = client.get(
        f"/v1/job-cards/{job_id}/slots",
        headers=headers,
        params={"from": slot_from, "to": slot_to, "visit_type": "INSPECTION"},
    )
    assert slots.status_code == 200, slots.text
    available = [row for row in slots.json()["slots"] if row["available"]]
    assert available
    target = next((row for row in available if "11:00" in row["label"]), available[0])
    held = client.post(
        f"/v1/job-cards/{job_id}/slot-holds",
        headers={**headers, "Idempotency-Key": "ir-hold-1"},
        json={"slot_id": target["slot_id"]},
    )
    assert held.status_code == 201, held.text
    booked = client.post(
        f"/v1/job-cards/{job_id}/book",
        headers={**headers, "Idempotency-Key": "ir-book-1"},
        json={"slot_hold_id": held.json()["hold"]["id"], "visit_type": "INSPECTION"},
    )
    assert booked.status_code == 201, booked.text
    card = client.get(f"/v1/job-cards/{job_id}", headers=headers)
    assert card.json()["job_card"]["status"] == "INSPECTION_BOOKED"
    return job_id, booked.json()["booking"]["id"]


def _assign_and_submit_findings(client: TestClient, job_id: str, headers: dict[str, str]) -> str:
    db = TestingSessionLocal()
    try:
        tech = seed_phase06(db, also_today=False)
        technician_id = tech.id
        profile_id = tech.profile_id
    finally:
        db.close()
    admin_sub = str(uuid4())
    promote_admin(admin_sub)
    admin_headers = {"Authorization": f"Bearer {make_token(admin_sub, phone='+919900010001')}"}
    assigned = client.post(
        f"/v1/admin/jobs/{job_id}/assign",
        headers={**admin_headers, "Idempotency-Key": str(uuid4())},
        json={"technician_id": technician_id, "visit_type": "INSPECTION"},
    )
    assert assigned.status_code == 201, assigned.text
    visit_id = assigned.json()["visit_id"]
    tech_headers = {"Authorization": f"Bearer {make_token(profile_id, phone='+919900011001')}"}
    assert (
        client.post(
            f"/v1/technician/visits/{visit_id}/en-route",
            headers={**tech_headers, "Idempotency-Key": str(uuid4())},
        ).status_code
        == 200
    )
    assert (
        client.post(
            f"/v1/technician/visits/{visit_id}/check-in",
            headers={**tech_headers, "Idempotency-Key": str(uuid4())},
            json={"lat": 12.93, "lng": 77.61},
        ).status_code
        == 200
    )
    started = client.post(
        f"/v1/technician/visits/{visit_id}/start-inspection",
        headers={**tech_headers, "Idempotency-Key": str(uuid4())},
    )
    assert started.status_code == 200, started.text
    submitted = client.post(
        f"/v1/technician/visits/{visit_id}/inspection-findings",
        headers={**tech_headers, "Idempotency-Key": str(uuid4())},
        json=FINDINGS,
    )
    assert submitted.status_code == 200, submitted.text
    return visit_id


def test_inspection_repair_two_visit_e2e(client: TestClient) -> None:
    headers = _auth()
    job_id, _booking_id = _create_and_book_inspection(client, headers)
    _assign_and_submit_findings(client, job_id, headers)

    findings = client.get(f"/v1/job-cards/{job_id}/inspection-findings", headers=headers)
    assert findings.status_code == 200, findings.text
    payload = findings.json()
    dumped = str(payload)
    assert "unit_cost" not in dumped
    assert "unit_price" not in dumped
    summary = payload["estimate_summary"]
    assert summary["source"] == "inspection"
    assert summary["parts_advance"]["amount_minor"] == 480000
    estimate_id = summary["estimate_id"]
    total = summary["total"]["amount_minor"]
    content_hash = summary["content_hash"]

    card = client.get(f"/v1/job-cards/{job_id}", headers=headers)
    assert card.json()["job_card"]["status"] == "REPAIR_APPROVAL_DUE"
    assert card.json()["job_card"]["customer_progress"] == "ESTIMATE_APPROVAL_REQUIRED"

    accepted = client.post(
        f"/v1/job-cards/{job_id}/estimates/{estimate_id}/accept",
        headers={**headers, "Idempotency-Key": "ir-accept-1"},
        json={"expected_total_minor": total, "expected_content_hash": content_hash},
    )
    assert accepted.status_code == 200, accepted.text
    assert accepted.json()["flow_decision"]["required_next_action"] == "PAY_PARTS_ADVANCE"

    order = client.post(
        f"/v1/job-cards/{job_id}/parts-advance/payment-order",
        headers={**headers, "Idempotency-Key": "ir-pay-1"},
        json={"estimate_id": estimate_id, "expected_amount_minor": 480000},
    )
    assert order.status_code == 200, order.text
    payment_id = order.json()["payment_id"]
    captured = client.post(f"/v1/dev/payments/{payment_id}/capture", headers=headers)
    assert captured.status_code == 200, captured.text
    assert captured.json()["status"] == "CAPTURED"

    pending = client.get(f"/v1/job-cards/{job_id}", headers=headers)
    assert pending.json()["job_card"]["status"] == "PARTS_PENDING"

    admin_sub = str(uuid4())
    promote_admin(admin_sub)
    admin_headers = {"Authorization": f"Bearer {make_token(admin_sub, phone='+919900010001')}"}
    ready = client.post(f"/v1/admin/job-cards/{job_id}/parts-ready", headers=admin_headers)
    assert ready.status_code == 200, ready.text
    assert ready.json()["status"] == "REPAIR_BOOKING_REQUIRED"

    slot_from, slot_to = _slot_window()
    slots = client.get(
        f"/v1/job-cards/{job_id}/slots",
        headers=headers,
        params={"from": slot_from, "to": slot_to, "visit_type": "REPAIR"},
    )
    available = [row for row in slots.json()["slots"] if row["available"]]
    target = available[0]
    held = client.post(
        f"/v1/job-cards/{job_id}/slot-holds",
        headers={**headers, "Idempotency-Key": "ir-hold-2"},
        json={"slot_id": target["slot_id"]},
    )
    assert held.status_code == 201, held.text
    repair = client.post(
        f"/v1/job-cards/{job_id}/book-repair",
        headers={**headers, "Idempotency-Key": "ir-book-2"},
        json={"slot_hold_id": held.json()["hold"]["id"], "visit_type": "REPAIR"},
    )
    assert repair.status_code == 201, repair.text
    card = client.get(f"/v1/job-cards/{job_id}", headers=headers)
    assert card.json()["job_card"]["status"] == "REPAIR_BOOKED"

    db = TestingSessionLocal()
    try:
        visits = list(db.scalars(select(Visit).where(Visit.job_card_id == job_id)).all())
        types = sorted(v.visit_type for v in visits)
        assert types == ["INSPECTION", "REPAIR"]
        estimate_id_kept = card.json()["job_card"]["accepted_inspection_estimate_id"]
        assert estimate_id_kept == estimate_id
    finally:
        db.close()


def test_technician_price_fields_rejected(client: TestClient) -> None:
    headers = _auth()
    job_id, _ = _create_and_book_inspection(client, headers)
    db = TestingSessionLocal()
    try:
        tech = seed_phase06(db, also_today=False)
        technician_id = tech.id
        profile_id = tech.profile_id
    finally:
        db.close()
    admin_sub = str(uuid4())
    promote_admin(admin_sub)
    admin_headers = {"Authorization": f"Bearer {make_token(admin_sub, phone='+919900010001')}"}
    assigned = client.post(
        f"/v1/admin/jobs/{job_id}/assign",
        headers={**admin_headers, "Idempotency-Key": str(uuid4())},
        json={"technician_id": technician_id, "visit_type": "INSPECTION"},
    )
    visit_id = assigned.json()["visit_id"]
    tech_headers = {"Authorization": f"Bearer {make_token(profile_id, phone='+919900011001')}"}
    client.post(
        f"/v1/technician/visits/{visit_id}/en-route",
        headers={**tech_headers, "Idempotency-Key": str(uuid4())},
    )
    client.post(
        f"/v1/technician/visits/{visit_id}/check-in",
        headers={**tech_headers, "Idempotency-Key": str(uuid4())},
        json={"lat": 12.93, "lng": 77.61},
    )
    client.post(
        f"/v1/technician/visits/{visit_id}/start-inspection",
        headers={**tech_headers, "Idempotency-Key": str(uuid4())},
    )
    priced = client.post(
        f"/v1/technician/visits/{visit_id}/inspection-findings",
        headers={**tech_headers, "Idempotency-Key": str(uuid4())},
        json={
            "summary": "pads",
            "recommended_parts": [
                {
                    "sku_code": "front-brake-pad-set",
                    "label": "pads",
                    "quantity": 1,
                    "unit_cost": 100,
                }
            ],
        },
    )
    assert priced.status_code == 422
