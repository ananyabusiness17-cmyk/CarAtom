from app.db.models import Base
from app.modules.addresses.models import Address
from app.modules.bookings.models import Booking
from app.modules.estimates.models import Estimate
from app.modules.job_cards.models import JobCard
from app.modules.slots.models import SlotHold
from app.modules.vehicles.models import Vehicle


def test_phase03_models_registered() -> None:
    names = set(Base.metadata.tables)
    for table in (
        "vehicles",
        "addresses",
        "job_cards",
        "estimates",
        "bookings",
        "slot_holds",
        "service_calendars",
        "idempotency_keys",
        "technicians",
        "visits",
        "technician_assignments",
        "job_parts",
        "qc_checks",
        "media_assets",
        "outbox_events",
        "payments",
        "parts_advance_allocations",
        "invoices",
        "reviews",
        "notifications",
    ):
        assert table in names
    assert Vehicle.__tablename__ == "vehicles"
    assert Address.__tablename__ == "addresses"
    assert JobCard.__tablename__ == "job_cards"
    assert Estimate.__tablename__ == "estimates"
    assert Booking.__tablename__ == "bookings"
    assert SlotHold.__tablename__ == "slot_holds"
