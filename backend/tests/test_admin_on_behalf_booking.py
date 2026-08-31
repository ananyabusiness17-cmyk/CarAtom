from datetime import date, datetime, time, timedelta
from uuid import uuid4

from app.core.time import IST
from app.modules.catalog.seed import GS_SLUG
from tests.conftest import make_token, promote_admin

VEHICLE = {
    "make": "Honda",
    "model": "City",
    "year": 2019,
    "fuel_type": "PETROL",
    "transmission": "MANUAL",
}
ADDRESS = {
    "line1": "12, 5th Cross, Koramangala 5th Block",
    "locality": "Koramangala 5th Block",
    "city": "Bengaluru",
    "postal_code": "560034",
    "latitude": 12.9352,
    "longitude": 77.6245,
}


def test_on_behalf_booking_creates_job(client):
    customer_id = str(uuid4())
    customer_headers = {"Authorization": f"Bearer {make_token(customer_id)}"}
    client.patch("/v1/me", headers=customer_headers, json={"full_name": "Rajesh Kumar"})
    vehicle = client.post("/v1/me/vehicles", headers=customer_headers, json=VEHICLE)
    assert vehicle.status_code in {200, 201}, vehicle.text
    vehicle_id = vehicle.json()["id"]
    address = client.post("/v1/me/addresses", headers=customer_headers, json=ADDRESS)
    assert address.status_code in {200, 201}, address.text
    admin_sub = str(uuid4())
    promote_admin(admin_sub)
    admin = {"Authorization": f"Bearer {make_token(admin_sub)}"}
    start = datetime.combine(date.today() + timedelta(days=1), time(11, 0), tzinfo=IST)
    booked = client.post(
        "/v1/admin/bookings/on-behalf",
        headers={**admin, "Idempotency-Key": "on-behalf-1"},
        json={
            "customer_profile_id": customer_id,
            "service_offering_slug": GS_SLUG,
            "vehicle_id": vehicle_id,
            "slot_id": start.isoformat(),
            "concerns": [{"text": "Walk-in WhatsApp request"}],
            "admin_note": "Booked by Priya at desk",
        },
    )
    assert booked.status_code == 201, booked.text
    body = booked.json()
    assert body["public_ref"].startswith("JC-")
    assert body["audit_id"]
    listed = client.get("/v1/admin/job-cards", headers=admin, params={"q": body["public_ref"]})
    assert listed.status_code == 200
    assert any(row["public_ref"] == body["public_ref"] for row in listed.json()["items"])
