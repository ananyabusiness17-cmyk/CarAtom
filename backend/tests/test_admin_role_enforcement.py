from uuid import uuid4

from tests.conftest import TestingSessionLocal, make_token, promote_admin


def _admin_headers():
    sub = str(uuid4())
    promote_admin(sub)
    return {"Authorization": f"Bearer {make_token(sub)}"}, sub


def test_customer_forbidden_on_admin_inventory(client):
    sub = str(uuid4())
    token = make_token(sub)
    response = client.get(
        "/v1/admin/inventory/skus",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403
    assert response.json()["code"] == "FORBIDDEN"


def test_technician_forbidden_on_admin_audit(client):
    from app.db.models import Profile

    sub = str(uuid4())
    db = TestingSessionLocal()
    try:
        db.add(Profile(id=sub, role="technician", is_active=True, phone="+919900000099"))
        db.commit()
    finally:
        db.close()
    token = make_token(sub, phone="+919900000099")
    response = client.get(
        "/v1/admin/audit-logs",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403


def test_disabled_customer_cannot_use_me(client):
    from app.db.models import Profile

    sub = str(uuid4())
    db = TestingSessionLocal()
    try:
        db.add(Profile(id=sub, role="customer", is_active=False, phone="+919800000088"))
        db.commit()
    finally:
        db.close()
    token = make_token(sub, phone="+919800000088")
    response = client.get("/v1/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403
