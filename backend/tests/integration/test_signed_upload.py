from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.modules.media.models import MediaAsset
from app.modules.visits.demo import seed_phase06
from app.modules.visits.models import Visit
from tests.conftest import TestingSessionLocal, make_token


def test_signed_upload_for_assigned_visit(client: TestClient) -> None:
    db = TestingSessionLocal()
    try:
        tech = seed_phase06(db, also_today=False)
        visit = db.scalar(select(Visit).where(Visit.public_ref == "V-1042-A"))
        assert visit is not None
        visit_id = visit.id
        profile_id = tech.profile_id
    finally:
        db.close()

    headers = {"Authorization": f"Bearer {make_token(profile_id, phone='+919900011001')}"}
    response = client.post(
        "/v1/media/signed-upload",
        headers=headers,
        json={
            "visit_id": visit_id,
            "filename": "evidence.jpg",
            "content_type": "image/jpeg",
            "byte_size": 2048000,
        },
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["upload_url"]
    assert body["asset_id"]
    upload_headers = body["upload_headers"]
    assert "Authorization" not in upload_headers
    assert not any("bearer" in f"{k}:{v}".lower() for k, v in upload_headers.items())
    confirm = client.post(f"/v1/media/{body['asset_id']}/confirm", headers=headers)
    assert confirm.status_code == 200
    assert confirm.json()["status"] == "ready"

    db = TestingSessionLocal()
    try:
        asset = db.get(MediaAsset, body["asset_id"])
        assert asset is not None
        assert asset.visit_id == visit_id
        assert asset.status == "ready"
    finally:
        db.close()


def test_signed_upload_rejects_unassigned(client: TestClient) -> None:
    db = TestingSessionLocal()
    try:
        seed_phase06(db, also_today=False)
        visit = db.scalar(select(Visit).where(Visit.public_ref == "V-1042-A"))
        assert visit is not None
        visit_id = visit.id
    finally:
        db.close()
    other = str(uuid4())
    headers = {"Authorization": f"Bearer {make_token(other)}"}
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
