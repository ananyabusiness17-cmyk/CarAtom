from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db.models import Profile
from app.modules.advisor.models import AdvisorCase
from app.modules.job_cards.models import JobCard
from app.modules.visits.phase10 import seed_phase10
from tests.conftest import TestingSessionLocal, make_token, promote_admin


def _promote_role(sub: str, role: str) -> None:
    db = TestingSessionLocal()
    try:
        profile = db.get(Profile, sub)
        if profile is None:
            profile = Profile(id=sub, role=role, is_active=True, phone="+919800000088")
            db.add(profile)
        else:
            profile.role = role
        db.commit()
    finally:
        db.close()


def _admin_headers() -> dict[str, str]:
    sub = str(uuid4())
    promote_admin(sub)
    return {"Authorization": f"Bearer {make_token(sub, phone='+919900010001')}"}


def _seed() -> dict:
    db = TestingSessionLocal()
    try:
        techs = seed_phase10(db)
        jobs = {
            row.public_ref: row.id
            for row in db.scalars(
                select(JobCard).where(JobCard.public_ref.in_(["JC-1015", "JC-1042", "JC-0991"]))
            )
        }
        return {
            "techs": {name: tech.id for name, tech in techs.items()},
            "jobs": jobs,
        }
    finally:
        db.close()


def test_dispatch_board_returns_technicians_and_unassigned(client: TestClient) -> None:
    seeded = _seed()
    headers = _admin_headers()
    response = client.get("/v1/admin/dispatch", headers=headers)
    assert response.status_code == 200, response.text
    body = response.json()
    names = {row["name"] for row in body["technicians"]}
    assert {"Imran", "Kavya", "Dev"} <= names
    duty = {row["name"]: row["duty_status"] for row in body["technicians"]}
    assert duty["Imran"] == "ON_DUTY"
    assert duty["Kavya"] == "ON_DUTY"
    assert duty["Dev"] == "OFF_DUTY"
    unassigned_refs = {row["job_card_ref"] for row in body["unassigned_jobs"]}
    assert "JC-1015" in unassigned_refs
    jc1015 = next(row for row in body["unassigned_jobs"] if row["job_card_ref"] == "JC-1015")
    assert jc1015["visit_id"]
    assert jc1015["job_card_id"] == seeded["jobs"]["JC-1015"]


def test_job_board_has_mobile_labels(client: TestClient) -> None:
    _seed()
    headers = _admin_headers()
    response = client.get(
        "/v1/admin/job-cards?limit=100",
        headers={**headers, "X-Client-Surface": "admin_mobile"},
    )
    assert response.status_code == 200, response.text
    items = {row["public_ref"]: row for row in response.json()["items"]}
    assert items["JC-1015"]["status_label"] == "Unassigned"
    assert items["JC-1015"]["needs_dispatch"] is True
    assert items["JC-1015"]["vehicle_label"] == "i20"
    assert items["JC-1042"]["status_label"] == "Inspecting"
    assert items["JC-1042"]["assigned_technician"]["name"] == "Imran"
    assert items["JC-0991"]["status_label"] == "Parts advance"
    assert items["JC-0991"]["assigned_technician"]["name"] == "Kavya"
    assert items["JC-0991"]["payment_chip"] == "Parts advance"


def test_lite_view_does_not_start_advisor_case(client: TestClient) -> None:
    seeded = _seed()
    job_id = seeded["jobs"]["JC-1015"]
    headers = _admin_headers()
    lite = client.get(f"/v1/admin/job-cards/{job_id}?view=lite", headers=headers)
    assert lite.status_code == 200, lite.text
    body = lite.json()
    assert "phone_e164" not in body
    assert body["ref"] == "JC-1015"
    db = TestingSessionLocal()
    try:
        case = db.scalar(select(AdvisorCase).where(AdvisorCase.job_card_id == job_id))
        assert case is None
    finally:
        db.close()


def test_assign_requires_idempotency_key(client: TestClient) -> None:
    seeded = _seed()
    headers = _admin_headers()
    job_id = seeded["jobs"]["JC-1015"]
    tech_id = seeded["techs"]["imran"]
    response = client.post(
        f"/v1/admin/jobs/{job_id}/assign",
        headers=headers,
        json={"technician_id": tech_id},
    )
    assert response.status_code == 400
    assert response.json()["code"] == "IDEMPOTENCY_KEY_REQUIRED"


def test_assign_same_key_different_body_conflicts(client: TestClient) -> None:
    seeded = _seed()
    headers = _admin_headers()
    job_id = seeded["jobs"]["JC-1015"]
    key = str(uuid4())
    first = client.post(
        f"/v1/admin/jobs/{job_id}/assign",
        headers={**headers, "Idempotency-Key": key},
        json={"technician_id": seeded["techs"]["imran"]},
    )
    assert first.status_code == 201, first.text
    second = client.post(
        f"/v1/admin/jobs/{job_id}/assign",
        headers={**headers, "Idempotency-Key": key},
        json={"technician_id": seeded["techs"]["kavya"], "reason": "try other tech"},
    )
    assert second.status_code == 409, second.text
    assert second.json()["code"] == "IDEMPOTENCY_CONFLICT"


def test_assign_off_duty_rejected(client: TestClient) -> None:
    seeded = _seed()
    headers = _admin_headers()
    response = client.post(
        f"/v1/admin/jobs/{seeded['jobs']['JC-1015']}/assign",
        headers={**headers, "Idempotency-Key": str(uuid4())},
        json={"technician_id": seeded["techs"]["dev"]},
    )
    assert response.status_code == 409, response.text
    assert response.json()["code"] == "TECH_OFF_DUTY"


def test_assign_writes_real_audit(client: TestClient) -> None:
    seeded = _seed()
    headers = _admin_headers()
    job_id = seeded["jobs"]["JC-1015"]
    response = client.post(
        f"/v1/admin/jobs/{job_id}/assign",
        headers={**headers, "Idempotency-Key": str(uuid4())},
        json={"technician_id": seeded["techs"]["imran"], "reason": "On-call van available now"},
    )
    assert response.status_code == 201, response.text
    assert response.json()["audit_ref"]
    audit = client.get(
        f"/v1/admin/audit-logs?resource_id={response.json()['public_ref']}",
        headers=headers,
    )
    assert audit.status_code == 200
    commands = [row["command"] for row in audit.json()["items"]]
    assert "dispatch.assign" in commands


def test_customer_and_technician_forbidden_on_ops(client: TestClient) -> None:
    seeded = _seed()
    job_id = seeded["jobs"]["JC-1015"]
    customer_sub = str(uuid4())
    tech_sub = str(uuid4())
    _promote_role(tech_sub, "technician")
    customer = {"Authorization": f"Bearer {make_token(customer_sub)}"}
    technician = {"Authorization": f"Bearer {make_token(tech_sub)}"}
    paths = [
        ("GET", "/v1/admin/dispatch", None),
        ("GET", "/v1/admin/job-cards", None),
        ("GET", f"/v1/admin/job-cards/{job_id}?view=lite", None),
        ("POST", f"/v1/admin/jobs/{job_id}/assign", {"technician_id": str(uuid4())}),
        (
            "POST",
            f"/v1/admin/job-cards/{job_id}/override",
            {
                "action": "FORCE_STATUS",
                "target_status": "COMPLETED",
                "reason": "long enough reason",
            },
        ),
    ]
    for method, path, body in paths:
        for headers in (customer, technician):
            if method == "GET":
                response = client.get(path, headers=headers)
            else:
                response = client.request(
                    method,
                    path,
                    headers={**headers, "Idempotency-Key": str(uuid4())},
                    json=body,
                )
            assert response.status_code == 403, f"{method} {path} {headers} {response.text}"
