from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db.models import ServiceOffering
from tests.conftest import TestingSessionLocal


def test_catalog_home_koramangala(client: TestClient) -> None:
    response = client.get("/v1/catalog/home")
    assert response.status_code == 200
    body = response.json()
    assert body["service_area"]["slug"] == "koramangala-bengaluru"
    assert body["service_area"]["serviceable"] is True
    offering = body["sections"]["general_service"]["offering"]
    assert offering["slug"] == "general-service-health-report"
    assert offering["flow_policy"] == "GENERAL_SERVICE"
    assert offering["display_price"]["amount_minor"] == 299900
    assert offering["display_price"]["label"] == "From ₹2,999"
    assert len(offering["included_items"]) == 4
    assert len(body["sections"]["one_man_jobs"]) == 6
    assert (
        body["sections"]["service_repair_entry"]["offering_slug"] == "general-service-health-report"
    )
    labels = [job["name"] for job in body["sections"]["one_man_jobs"]]
    assert "Inspect + repair" not in labels
    assert "Inspection + Repair" not in str(body)
    assert body["sections"]["sos"]["headline"].startswith("Emergency")
    uncertain = body["sections"]["uncertain_repair"]
    assert uncertain["offering_slug"] == "inspection-and-repair"
    assert uncertain["title"] == "Uncertain repair?"


def test_one_man_list_has_six(client: TestClient) -> None:
    response = client.get("/v1/services", params={"flow_policy": "ONE_MAN"})
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 6
    assert len(body["items"]) == 6


def test_list_services_filters_inactive(client: TestClient) -> None:
    db = TestingSessionLocal()
    try:
        row = db.scalar(select(ServiceOffering).where(ServiceOffering.slug == "bulb-headlight"))
        assert row is not None
        row.is_active = False
        db.commit()
    finally:
        db.close()

    response = client.get("/v1/services", params={"flow_policy": "ONE_MAN"})
    assert response.status_code == 200
    slugs = [item["slug"] for item in response.json()["items"]]
    assert "bulb-headlight" not in slugs
    assert "wiper-blades" in slugs
    assert response.json()["total"] == 5


def test_service_by_slug(client: TestClient) -> None:
    response = client.get("/v1/services/general-service-health-report")
    assert response.status_code == 200
    body = response.json()
    assert body["flow_policy"] == "GENERAL_SERVICE"
    assert "cost_minor" not in body
    assert len(body["included_items"]) == 4


def test_service_slug_404(client: TestClient) -> None:
    missing = client.get("/v1/services/does-not-exist")
    assert missing.status_code == 404
    db = TestingSessionLocal()
    try:
        row = db.scalar(select(ServiceOffering).where(ServiceOffering.slug == "wiper-blades"))
        assert row is not None
        row.is_active = False
        db.commit()
    finally:
        db.close()
    inactive = client.get("/v1/services/wiper-blades")
    assert inactive.status_code == 404
