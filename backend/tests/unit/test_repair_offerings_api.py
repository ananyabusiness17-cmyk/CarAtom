from fastapi.testclient import TestClient


def test_lists_six_seeded_offerings(client: TestClient) -> None:
    response = client.get("/v1/repair-offerings")
    assert response.status_code == 200, response.text
    slugs = {item["slug"] for item in response.json()["items"]}
    assert slugs == {
        "ac-gas-refill",
        "brake-pads-pair",
        "ac-condenser-oem",
        "bumper-repaint",
        "cabin-filter",
        "headlight-assembly",
    }
    assert all(item["compatible"] is True for item in response.json()["items"])


def test_query_filters_name(client: TestClient) -> None:
    response = client.get("/v1/repair-offerings", params={"query": "brake"})
    assert response.status_code == 200
    slugs = {item["slug"] for item in response.json()["items"]}
    assert slugs == {"brake-pads-pair"}
