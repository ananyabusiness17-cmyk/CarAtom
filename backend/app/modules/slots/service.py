from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common.errors import DomainProblem
from app.config import settings
from app.core.deps import CurrentUser
from app.core.flow_decision import build_flow_decision
from app.modules.bookings.models import Booking
from app.modules.job_cards.service import JobCardService, to_flow_schema
from app.modules.slots.generator import generate_slots, parse_slot_id
from app.modules.slots.models import Holiday, ServiceCalendar, SlotHold
from app.modules.slots.schemas import HoldOut, HoldResponse, SlotOut, SlotsResponse


class SlotService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.job_cards = JobCardService(db)

    def _calendar(self) -> ServiceCalendar:
        calendar = self.db.scalar(
            select(ServiceCalendar).where(ServiceCalendar.slug == "koramangala-default")
        )
        if calendar is None:
            calendar = ServiceCalendar(
                slug="koramangala-default",
                timezone="Asia/Kolkata",
                slot_capacity=settings.slot_capacity,
            )
            self.db.add(calendar)
            self.db.flush()
        return calendar

    def expire_holds(self) -> None:
        now = datetime.now(UTC)
        holds = self.db.scalars(select(SlotHold).where(SlotHold.status == "ACTIVE")).all()
        for hold in holds:
            expires = hold.expires_at
            if expires.tzinfo is None:
                expires = expires.replace(tzinfo=UTC)
            if expires < now:
                hold.status = "EXPIRED"

    def _visit_minutes(self, job_card, visit_type: str | None = None) -> int:
        from app.db.models import ServiceOffering

        offering = (
            self.db.get(ServiceOffering, job_card.service_offering_id)
            if job_card.service_offering_id
            else None
        )
        if visit_type == "INSPECTION" or (
            job_card.flow_policy == "INSPECTION_REPAIR"
            and job_card.status in {"READY_TO_BOOK", "EDITABLE", "FINALIZATION_IN_PROGRESS"}
        ):
            return 60
        if visit_type == "REPAIR" or (
            job_card.flow_policy == "INSPECTION_REPAIR"
            and job_card.status
            in {
                "REPAIR_BOOKING_REQUIRED",
                "PARTS_PENDING",
                "PARTS_ADVANCE_DUE",
                "REPAIR_BOOKED",
            }
        ):
            return 180
        if job_card.flow_policy == "ONE_MAN":
            return offering.duration_minutes if offering and offering.duration_minutes else 30
        return 120

    def list_slots(
        self, job_card_id: str, user: CurrentUser, from_date, to_date, visit_type: str = "SERVICE"
    ) -> SlotsResponse:
        job_card = self.job_cards.get_accessible(job_card_id, user)
        self.expire_holds()
        calendar = self._calendar()
        holds = list(self.db.scalars(select(SlotHold).where(SlotHold.status == "ACTIVE")).all())
        bookings = list(
            self.db.scalars(
                select(Booking).where(Booking.status.in_(["CONFIRMED", "HOLDING", "IN_PROGRESS"]))
            ).all()
        )
        holidays = list(
            self.db.scalars(select(Holiday).where(Holiday.calendar_id == calendar.id)).all()
        )
        minutes = self._visit_minutes(job_card, visit_type)
        generated = generate_slots(
            calendar,
            from_date,
            to_date,
            holds,
            bookings,
            holidays,
            step_minutes=minutes,
        )
        return SlotsResponse(
            timezone=calendar.timezone,
            visit_duration_minutes=minutes,
            slots=[
                SlotOut(
                    slot_id=slot.slot_id,
                    starts_at=slot.starts_at,
                    ends_at=slot.ends_at,
                    label=slot.label,
                    available=slot.available,
                )
                for slot in generated
            ],
        )

    def create_hold(
        self,
        job_card_id: str,
        slot_id: str,
        user: CurrentUser,
        idempotency_key: str | None,
    ) -> HoldResponse:
        job_card = self.job_cards.get_accessible(job_card_id, user)
        if job_card.status not in {
            "READY_TO_BOOK",
            "REPAIR_BOOKING_REQUIRED",
            "PARTS_PENDING",
            "PARTS_ADVANCE_DUE",
            "REPAIR_BOOKED",
        }:
            raise DomainProblem(
                409,
                "INVALID_STATE_TRANSITION",
                "Finalize details before selecting a slot.",
                allowed_actions=["FINALIZE"],
            )
        self.expire_holds()
        starts = parse_slot_id(slot_id)
        minutes = self._visit_minutes(job_card)
        ends = starts + timedelta(minutes=minutes)
        calendar = self._calendar()
        holds = list(self.db.scalars(select(SlotHold).where(SlotHold.status == "ACTIVE")).all())
        bookings = list(
            self.db.scalars(
                select(Booking).where(Booking.status.in_(["CONFIRMED", "HOLDING"]))
            ).all()
        )
        holidays = list(
            self.db.scalars(select(Holiday).where(Holiday.calendar_id == calendar.id)).all()
        )
        generated = generate_slots(
            calendar,
            starts.date(),
            starts.date(),
            holds,
            bookings,
            holidays,
            now=starts.replace(hour=0),
            step_minutes=minutes,
        )
        match = next((slot for slot in generated if slot.starts_at == starts), None)
        occupied = sum(
            1
            for hold in holds
            if hold.job_card_id != job_card_id
            and hold.status == "ACTIVE"
            and hold.slot_starts_at == starts
        )
        occupied += sum(1 for booking in bookings if booking.slot_starts_at == starts)
        if match is None or occupied >= calendar.slot_capacity:
            raise DomainProblem(
                409,
                "SLOT_UNAVAILABLE",
                "That time is no longer available.",
                retryable=True,
                allowed_actions=["LIST_SLOTS"],
            )

        for hold in holds:
            if hold.job_card_id == job_card_id and hold.status == "ACTIVE":
                hold.status = "RELEASED"

        hold = SlotHold(
            job_card_id=job_card_id,
            profile_id=user.id,
            slot_starts_at=starts,
            slot_ends_at=ends,
            timezone="Asia/Kolkata",
            status="ACTIVE",
            expires_at=datetime.now(UTC) + timedelta(minutes=settings.slot_hold_minutes),
            idempotency_key=idempotency_key,
        )
        self.db.add(hold)
        self.db.commit()
        self.db.refresh(hold)
        loaded = self.job_cards.repo.get(job_card_id)
        assert loaded is not None
        estimate = self.job_cards.estimates.latest_for_job(job_card_id)
        decision = build_flow_decision(loaded, estimate, has_active_hold=True)
        return HoldResponse(
            hold=HoldOut(
                id=hold.id,
                slot_starts_at=hold.slot_starts_at,
                slot_ends_at=hold.slot_ends_at,
                expires_at=hold.expires_at,
                status=hold.status,
            ),
            flow_decision=to_flow_schema(decision),
        )
