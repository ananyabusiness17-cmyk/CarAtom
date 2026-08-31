from uuid import uuid4

from fastapi.testclient import TestClient

from tests.conftest import make_token


def test_customer_cannot_call_admin(client: TestClient) -> None:
    token = make_token(str(uuid4()))
    response = client.get("/v1/admin/ping", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403
    assert response.json()["code"] == "FORBIDDEN"
