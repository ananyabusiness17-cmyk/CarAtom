from uuid import uuid4

from app.modules.inventory.seed import seed_inventory_demo
from tests.conftest import TestingSessionLocal, make_token, promote_admin


def test_admin_inventory_crud(client):
    db = TestingSessionLocal()
    try:
        seed_inventory_demo(db)
    finally:
        db.close()
    sub = str(uuid4())
    promote_admin(sub)
    headers = {"Authorization": f"Bearer {make_token(sub)}"}
    listed = client.get("/v1/admin/inventory/skus?q=cabin", headers=headers)
    assert listed.status_code == 200
    assert listed.json()["low_stock_count"] >= 2
    created = client.post(
        "/v1/admin/inventory/skus",
        headers=headers,
        json={
            "sku_code": "TEST-SKU-1",
            "name": "Test gasket",
            "low_stock_threshold": 3,
        },
    )
    assert created.status_code == 201, created.text
    sku_id = created.json()["id"]
    patched = client.patch(
        f"/v1/admin/inventory/skus/{sku_id}",
        headers=headers,
        json={"name": "Test gasket OEM", "low_stock_threshold": 4},
    )
    assert patched.status_code == 200
    assert patched.json()["name"] == "Test gasket OEM"
    people = client.get("/v1/admin/people?q=Priya", headers=headers)
    assert people.status_code == 200
