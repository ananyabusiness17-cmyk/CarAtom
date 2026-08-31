from datetime import date, datetime, time

from app.core.time import IST
from app.modules.slots.generator import generate_slots
from app.modules.slots.models import ServiceCalendar


def test_four_windows_per_day() -> None:
    calendar = ServiceCalendar(slug="koramangala-default", timezone="Asia/Kolkata", slot_capacity=3)
    calendar.operating_start = time(9, 0)
    calendar.operating_end = time(18, 0)
    now = datetime(2026, 8, 18, 8, 0, tzinfo=IST)
    slots = generate_slots(
        calendar,
        date(2026, 8, 19),
        date(2026, 8, 19),
        [],
        [],
        [],
        now=now,
    )
    assert len(slots) == 4
    labels = [slot.label for slot in slots]
    assert "11:00 – 13:00" in labels
    assert all(slot.available for slot in slots)


def test_one_man_thirty_minute_windows() -> None:
    calendar = ServiceCalendar(slug="koramangala-default", timezone="Asia/Kolkata", slot_capacity=3)
    calendar.operating_start = time(9, 0)
    calendar.operating_end = time(18, 0)
    now = datetime(2026, 8, 18, 8, 0, tzinfo=IST)
    slots = generate_slots(
        calendar,
        date(2026, 8, 19),
        date(2026, 8, 19),
        [],
        [],
        [],
        now=now,
        step_minutes=30,
    )
    labels = [slot.label for slot in slots]
    assert "14:00 – 14:30" in labels
    assert "11:00 – 13:00" not in labels
    assert all((slot.ends_at - slot.starts_at).total_seconds() == 30 * 60 for slot in slots)
