from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.modules.visits.demo import seed_phase06
from app.modules.visits.models import Visit
from tests.conftest import TestingSessionLocal, make_token
from tests.integration.test_inspection_repair_e2e import (
    _assign_and_submit_findings,
    _auth,
    _create_and_book_inspection,
)


def test_dev_simulate_allows_customer_token_in_development(client: TestClient) -> None:
    headers = {"Authorization": f"Bearer {make_token(str(uuid4()))}"}
    response = client.post(
        f"/v1/dev/job-cards/{uuid4()}/simulate-advisor-estimate",
        headers=headers,
    )
    assert response.status_code == 404


def test_dev_auto_assign_requires_admin(client: TestClient) -> None:
    headers = {"Authorization": f"Bearer {make_token(str(uuid4()))}"}
    response = client.post(f"/v1/dev/bookings/{uuid4()}/auto-assign", headers=headers)
    assert response.status_code == 403


def test_payment_capture_hidden_in_production(client: TestClient, monkeypatch) -> None:
    from app.config import settings

    monkeypatch.setattr(settings, "env", "production")
    monkeypatch.setattr(settings, "enable_dev_simulate", False)
    headers = {"Authorization": f"Bearer {make_token(str(uuid4()))}"}
    response = client.post(f"/v1/dev/payments/{uuid4()}/capture", headers=headers)
    assert response.status_code == 404


def test_inspection_findings_not_readable_by_other_customer(client: TestClient) -> None:
    headers = _auth()
    job_id, _ = _create_and_book_inspection(client, headers)
    _assign_and_submit_findings(client, job_id, headers)
    other = _auth()
    leaked = client.get(f"/v1/job-cards/{job_id}/inspection-findings", headers=other)
    assert leaked.status_code == 404


def test_parts_advance_payment_not_readable_by_other_customer(client: TestClient) -> None:
    headers = _auth()
    job_id, _ = _create_and_book_inspection(client, headers)
    _assign_and_submit_findings(client, job_id, headers)
    findings = client.get(f"/v1/job-cards/{job_id}/inspection-findings", headers=headers).json()
    summary = findings["estimate_summary"]
    estimate_id = summary["estimate_id"]
    total = summary["total"]["amount_minor"]
    content_hash = summary["content_hash"]
    advance = summary["parts_advance"]["amount_minor"]
    assert advance == 480000
    accepted = client.post(
        f"/v1/job-cards/{job_id}/estimates/{estimate_id}/accept",
        headers={**headers, "Idempotency-Key": "sec-accept"},
        json={"expected_total_minor": total, "expected_content_hash": content_hash},
    )
    assert accepted.status_code == 200, accepted.text
    order = client.post(
        f"/v1/job-cards/{job_id}/parts-advance/payment-order",
        headers={**headers, "Idempotency-Key": "sec-pay"},
        json={"estimate_id": estimate_id, "expected_amount_minor": advance},
    )
    assert order.status_code == 200, order.text
    payment_id = order.json()["payment_id"]
    other = _auth()
    leaked = client.get(f"/v1/payments/{payment_id}", headers=other)
    assert leaked.status_code == 404
    capture = client.post(f"/v1/dev/payments/{payment_id}/capture", headers=other)
    assert capture.status_code == 404


def test_signed_upload_customer_cannot_use_unrelated_visit(client: TestClient) -> None:
    db = TestingSessionLocal()
    try:
        seed_phase06(db, also_today=False)
        visit = db.scalar(select(Visit).where(Visit.public_ref == "V-1042-A"))
        assert visit is not None
        visit_id = visit.id
    finally:
        db.close()
    headers = {"Authorization": f"Bearer {make_token(str(uuid4()))}"}
    response = client.post(
        "/v1/media/signed-upload",
        headers=headers,
        json={
            "visit_id": visit_id,
            "filename": "x.jpg",
            "content_type": "image/jpeg",
            "byte_size": 1000,
        },
    )
    assert response.status_code == 403


def test_supabase_signed_upload_headers_omit_service_role(monkeypatch) -> None:
    from app.config import settings
    from app.modules.media.storage import SupabaseStorage

    monkeypatch.setattr(settings, "supabase_url", "https://example.supabase.co")
    monkeypatch.setattr(settings, "supabase_service_role_key", "super-secret-service-role")

    class FakeResponse:
        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict[str, str]:
            return {"url": "/object/upload/sign/caratom-evidence/path?token=signed"}

    def fake_post(url, headers, json, timeout):  # noqa: ARG001
        assert "super-secret-service-role" in headers["Authorization"]
        return FakeResponse()

    monkeypatch.setattr("app.modules.media.storage.httpx.post", fake_post)
    url, headers, _expires = SupabaseStorage().create_signed_upload("a/b.jpg", "image/jpeg", 60)
    assert "token=signed" in url
    assert "Authorization" not in headers
    assert not any("bearer" in f"{k}:{v}".lower() for k, v in headers.items())
    assert "super-secret-service-role" not in str(headers)
