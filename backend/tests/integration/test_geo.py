from unittest.mock import patch

from fastapi.testclient import TestClient


def test_reverse_geocode(client: TestClient) -> None:
    payload = {
        "label": "5th Cross, Koramangala",
        "line1": "5th Cross",
        "locality": "Koramangala",
        "city": "Bengaluru",
        "postal_code": "560034",
        "latitude": 12.9352,
        "longitude": 77.6245,
        "source": "nominatim",
    }
    with patch("app.modules.geo.router.nominatim_reverse", return_value=payload):
        response = client.get("/v1/geo/reverse", params={"lat": 12.9352, "lng": 77.6245})
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["locality"] == "Koramangala"
    assert "amount_minor" not in body


def test_reverse_geocode_falls_back_to_coords(client: TestClient) -> None:
    with patch("app.modules.geo.router.nominatim_reverse", return_value=None):
        response = client.get("/v1/geo/reverse", params={"lat": 12.9352, "lng": 77.6245})
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["source"] == "coords"
    assert "12.93520" in body["label"]


def test_search_geocode(client: TestClient) -> None:
    with patch(
        "app.modules.geo.router.nominatim_search",
        return_value=[
            {
                "label": "Koramangala, Bengaluru",
                "line1": "Koramangala",
                "locality": "Koramangala",
                "city": "Bengaluru",
                "postal_code": "560034",
                "latitude": 12.9352,
                "longitude": 77.6245,
                "source": "nominatim",
            }
        ],
    ):
        response = client.get("/v1/geo/search", params={"q": "Koramangala"})
    assert response.status_code == 200, response.text
    assert response.json()["items"][0]["city"] == "Bengaluru"
