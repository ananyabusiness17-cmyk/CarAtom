from fastapi.testclient import TestClient

from app.modules.visits.demo import IMRAN_PHONE


def test_local_login_issues_token_in_development(client: TestClient) -> None:
    response = client.post("/v1/dev/local-login", json={"phone": IMRAN_PHONE, "code": "123456"})
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    me = client.get("/v1/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200, me.text
    body = me.json()
    assert body["role"] == "technician"
    assert body["phone"] == IMRAN_PHONE


def test_local_login_rejects_wrong_code(client: TestClient) -> None:
    response = client.post("/v1/dev/local-login", json={"phone": IMRAN_PHONE, "code": "000000"})
    assert response.status_code == 401


def test_local_login_hidden_in_production(client: TestClient, monkeypatch) -> None:
    from app.config import settings

    monkeypatch.setattr(settings, "env", "production")
    response = client.post("/v1/dev/local-login", json={"phone": IMRAN_PHONE, "code": "123456"})
    assert response.status_code == 404
