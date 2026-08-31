from uuid import uuid4

from app.modules.catalog.seed import GS_SLUG
from tests.conftest import make_token, promote_admin


def test_catalog_patch_updates_home(client):
    sub = str(uuid4())
    promote_admin(sub)
    headers = {"Authorization": f"Bearer {make_token(sub)}"}
    patched = client.patch(
        f"/v1/admin/catalog/offerings/{GS_SLUG}",
        headers=headers,
        json={"display_price_minor": 319900, "expected_version": 1},
    )
    assert patched.status_code == 200
    assert patched.json()["display_price_minor"] == 319900
    assert patched.json()["version"] == 2
    home = client.get("/v1/catalog/home")
    assert home.status_code == 200
    price = home.json()["sections"]["general_service"]["offering"]["display_price"]["amount_minor"]
    assert price == 319900


def test_catalog_version_mismatch(client):
    sub = str(uuid4())
    promote_admin(sub)
    headers = {"Authorization": f"Bearer {make_token(sub)}"}
    response = client.patch(
        f"/v1/admin/catalog/offerings/{GS_SLUG}",
        headers=headers,
        json={"display_price_minor": 100, "expected_version": 99},
    )
    assert response.status_code == 409
    assert response.json()["code"] == "VERSION_MISMATCH"
