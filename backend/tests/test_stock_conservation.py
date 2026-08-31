from uuid import uuid4

from app.modules.inventory.seed import seed_inventory_demo
from tests.conftest import TestingSessionLocal, make_token, promote_admin


def _admin():
    sub = str(uuid4())
    promote_admin(sub)
    return {"Authorization": f"Bearer {make_token(sub)}"}


def test_receive_consume_adjust_conservation(client):
    db = TestingSessionLocal()
    try:
        seed_inventory_demo(db)
    finally:
        db.close()
    headers = _admin()
    listed = client.get("/v1/admin/inventory/skus", headers=headers)
    assert listed.status_code == 200
    items = listed.json()["items"]
    assert len(items) >= 4
    cabin = next(row for row in items if row["sku_code"] == "CF-HON-01")
    start = cabin["total_quantity"]
    receive = client.post(
        "/v1/admin/inventory/movements",
        headers={**headers, "Idempotency-Key": "recv-1"},
        json={
            "movement_type": "RECEIVE",
            "sku_id": cabin["id"],
            "location_code": "WH",
            "quantity": 10,
            "reason": "Supplier invoice #4421",
            "reference": "PO-4421",
        },
    )
    assert receive.status_code == 201
    assert receive.json()["total_quantity"] == start + 10
    consume = client.post(
        "/v1/admin/inventory/movements",
        headers={**headers, "Idempotency-Key": "cons-1"},
        json={
            "movement_type": "CONSUME",
            "sku_id": cabin["id"],
            "location_code": "WH",
            "quantity": 3,
            "reason": "Fitted on visit",
        },
    )
    assert consume.status_code == 201
    after = consume.json()["total_quantity"]
    fail = client.post(
        "/v1/admin/inventory/movements",
        headers={**headers, "Idempotency-Key": "adj-fail"},
        json={
            "movement_type": "ADJUST",
            "sku_id": cabin["id"],
            "location_code": "WH",
            "quantity": after + 8,
            "adjust_delta": -1,
            "reason": "Cycle count would go negative",
        },
    )
    assert fail.status_code == 409
    assert fail.json()["code"] == "INSUFFICIENT_STOCK"


def test_movement_idempotency(client):
    db = TestingSessionLocal()
    try:
        seed_inventory_demo(db)
    finally:
        db.close()
    headers = _admin()
    cabin = next(
        row
        for row in client.get("/v1/admin/inventory/skus", headers=headers).json()["items"]
        if row["sku_code"] == "PAG-250"
    )
    body = {
        "movement_type": "RECEIVE",
        "sku_id": cabin["id"],
        "location_code": "WH",
        "quantity": 2,
        "reason": "Restock",
    }
    first = client.post(
        "/v1/admin/inventory/movements",
        headers={**headers, "Idempotency-Key": "same-key"},
        json=body,
    )
    second = client.post(
        "/v1/admin/inventory/movements",
        headers={**headers, "Idempotency-Key": "same-key"},
        json=body,
    )
    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["movement_id"] == second.json()["movement_id"]
