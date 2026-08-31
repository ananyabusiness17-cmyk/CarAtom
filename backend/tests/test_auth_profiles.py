from uuid import uuid4

from fastapi.testclient import TestClient

from tests.conftest import make_token


def test_me_unauthorized_without_token(client: TestClient) -> None:
    response = client.get("/v1/me")
    assert response.status_code == 401
    body = response.json()
    assert body["code"] == "UNAUTHORIZED"
    assert "request_id" in body


def test_me_valid_jwt_upserts_profile(client: TestClient) -> None:
    sub = str(uuid4())
    token = make_token(sub)
    response = client.get("/v1/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == sub
    assert body["role"] == "customer"
    assert body["phone"] == "+919876543210"
    assert body["phone_verified"] is True
    assert body["full_name"] is None


def test_me_expired_jwt_unauthorized(client: TestClient) -> None:
    token = make_token(str(uuid4()), expired=True)
    response = client.get("/v1/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
    assert response.json()["code"] == "INVALID_TOKEN"


def test_me_tampered_jwt_unauthorized(client: TestClient) -> None:
    token = make_token(str(uuid4())) + "tamper"
    response = client.get("/v1/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


def test_patch_own_name(client: TestClient) -> None:
    sub = str(uuid4())
    token = make_token(sub)
    headers = {"Authorization": f"Bearer {token}"}
    response = client.patch("/v1/me", headers=headers, json={"full_name": "Rajesh Kumar"})
    assert response.status_code == 200
    assert response.json()["full_name"] == "Rajesh Kumar"

    again = client.get("/v1/me", headers=headers)
    assert again.json()["full_name"] == "Rajesh Kumar"


def test_cannot_patch_another_sub(client: TestClient) -> None:
    first = str(uuid4())
    second = str(uuid4())
    client.patch(
        "/v1/me",
        headers={"Authorization": f"Bearer {make_token(first)}"},
        json={"full_name": "First User"},
    )
    other = client.get("/v1/me", headers={"Authorization": f"Bearer {make_token(second)}"})
    assert other.status_code == 200
    assert other.json()["id"] == second
    assert other.json()["full_name"] is None


def test_customer_forbidden_on_admin_ping(client: TestClient) -> None:
    token = make_token(str(uuid4()))
    response = client.get("/v1/admin/ping", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403
    assert response.json()["code"] == "FORBIDDEN"


def test_stub_token_rejected(client: TestClient) -> None:
    response = client.get("/v1/me", headers={"Authorization": "Bearer stub"})
    assert response.status_code == 401


def test_patch_rejects_blank_name(client: TestClient) -> None:
    token = make_token(str(uuid4()))
    response = client.patch(
        "/v1/me",
        headers={"Authorization": f"Bearer {token}"},
        json={"full_name": "   "},
    )
    assert response.status_code == 422


def test_patch_rejects_too_long_name(client: TestClient) -> None:
    token = make_token(str(uuid4()))
    response = client.patch(
        "/v1/me",
        headers={"Authorization": f"Bearer {token}"},
        json={"full_name": "x" * 121},
    )
    assert response.status_code == 422
