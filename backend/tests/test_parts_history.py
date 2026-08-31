from decimal import Decimal
from uuid import uuid4

from app.modules.catalog.seed import GS_SLUG
from app.modules.field_work.models import JobPart
from app.modules.inventory.seed import seed_inventory_demo
from tests.conftest import TestingSessionLocal, make_token, promote_admin


def test_parts_history_and_job_usage(client):
    db = TestingSessionLocal()
    try:
        seed_inventory_demo(db)
    finally:
        db.close()
    customer_id = str(uuid4())
    headers = {"Authorization": f"Bearer {make_token(customer_id)}"}
    client.patch("/v1/me", headers=headers, json={"full_name": "Rajesh Kumar"})
    created = client.post(
        "/v1/job-cards",
        headers=headers,
        json={
            "service_offering_slug": GS_SLUG,
            "vehicle_context": {
                "make": "Honda",
                "model": "City",
                "year": 2019,
                "fuel_type": "PETROL",
                "transmission": "MANUAL",
            },
            "concerns": [{"text": "AC weak"}],
        },
    )
    job_id = created.json()["job_card"]["id"]
    db = TestingSessionLocal()
    try:
        db.add(
            JobPart(
                visit_id=str(uuid4()),
                job_card_id=job_id,
                sku_code="CF-HON-01",
                label="Cabin filter",
                quantity=Decimal("1"),
            )
        )
        db.commit()
    finally:
        db.close()
    admin_sub = str(uuid4())
    promote_admin(admin_sub)
    admin = {"Authorization": f"Bearer {make_token(admin_sub)}"}
    usage = client.get(f"/v1/admin/inventory/job-usage/{job_id}", headers=admin)
    assert usage.status_code == 200, usage.text
    assert any(row["sku_code"] == "CF-HON-01" for row in usage.json()["items"])
    history = client.get(f"/v1/admin/customers/{customer_id}/parts-history", headers=admin)
    assert history.status_code == 200, history.text
    assert history.json()["customer_id"] == customer_id
