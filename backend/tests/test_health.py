from fastapi.testclient import TestClient


def test_health_returns_ok(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "version" in body
    assert body["environment"] in {"development", "production", "test"} or isinstance(
        body["environment"], str
    )
    assert body["database"] in {"ok", "degraded", "unavailable"}
    assert body["redis"] in {"ok", "unavailable"}
    assert body["timestamp"].endswith("Z")


def test_health_includes_request_id_header(client: TestClient) -> None:
    response = client.get("/health", headers={"X-Request-Id": "test-id"})
    assert response.headers["X-Request-Id"] == "test-id"
