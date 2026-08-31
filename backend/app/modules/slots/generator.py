from dataclasses import dataclass
from datetime import date, datetime, time, timedelta

from app.core.time import IST
from app.modules.bookings.models import Booking
from app.modules.slots.models import Holiday, ServiceCalendar, SlotHold

WINDOWS = [
    (time(9, 0), time(11, 0)),
    (time(11, 0), time(13, 0)),
    (time(14, 0), time(16, 0)),
    (time(16, 0), time(18, 0)),
]


@dataclass
class GeneratedSlot:
    starts_at: datetime
    ends_at: datetime
    available: bool

    @property
    def slot_id(self) -> str:
        return self.starts_at.isoformat()

    @property
    def label(self) -> str:
        return f"{self.starts_at.strftime('%H:%M')} – {self.ends_at.strftime('%H:%M')}"


def parse_slot_id(slot_id: str) -> datetime:
    parsed = datetime.fromisoformat(slot_id)
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=IST)
    return parsed.astimezone(IST)


def generate_slots(
    calendar: ServiceCalendar,
    from_date: date,
    to_date: date,
    existing_holds: list[SlotHold],
    existing_bookings: list[Booking],
    holidays: list[Holiday],
    now: datetime | None = None,
    *,
    step_minutes: int = 120,
) -> list[GeneratedSlot]:
    tz = IST
    holiday_dates = {row.holiday_date for row in holidays}
    capacity = calendar.slot_capacity
    current = now or datetime.now(tz)
    windows = _windows_for_step(step_minutes)
    slots: list[GeneratedSlot] = []
    day = from_date
    while day <= to_date:
        if day not in holiday_dates:
            for start_t, end_t in windows:
                starts = datetime.combine(day, start_t, tzinfo=tz)
                ends = datetime.combine(day, end_t, tzinfo=tz)
                occupied = 0
                for hold in existing_holds:
                    if hold.status == "ACTIVE" and _same_window(hold.slot_starts_at, starts):
                        occupied += 1
                for booking in existing_bookings:
                    if booking.status in {"CONFIRMED", "HOLDING", "IN_PROGRESS"} and _same_window(
                        booking.slot_starts_at, starts
                    ):
                        occupied += 1
                available = occupied < capacity and starts > current
                slots.append(GeneratedSlot(starts_at=starts, ends_at=ends, available=available))
        day += timedelta(days=1)
    return slots


def _windows_for_step(step_minutes: int) -> list[tuple[time, time]]:
    if step_minutes >= 120:
        return WINDOWS
    windows: list[tuple[time, time]] = []
    for start_hour, end_hour in ((9, 13), (14, 18)):
        cursor = time(start_hour, 0)
        end = time(end_hour, 0)
        while True:
            start_dt = datetime.combine(date(2000, 1, 1), cursor)
            end_dt = start_dt + timedelta(minutes=step_minutes)
            end_t = end_dt.time()
            if end_t > end or end_dt.day != 1:
                break
            windows.append((cursor, end_t))
            cursor = end_t
    return windows


def _instant(value: datetime) -> float:
    if value.tzinfo is None:
        value = value.replace(tzinfo=IST)
    return value.astimezone(IST).timestamp()


def _same_window(stored: datetime, starts: datetime) -> bool:
    return abs(_instant(stored) - _instant(starts)) < 1
