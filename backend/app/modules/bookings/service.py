from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.common.errors import DomainProblem
from app.core.deps import CurrentUser
from app.core.flow_decision import build_flow_decision
from app.core.refs import next_booking_ref, next_visit_ref
from app.core.time import IST
from app.db.models import Profile, ServiceOffering
from app.modules.addresses.models import Address
from app.modules.bookings.models import Booking, BookingSnapshot
from app.modules.bookings.schemas import (
    BookingDetailResponse,
    BookingOut,
    BookResponse,
    CustomerProgressOut,
    ProgressStepOut,
    SlotSummary,
)
from app.modules.inspection_repair.progress import customer_progress
from app.modules.job_cards import state_machine
from app.modules.job_cards.models import JobCard
from app.modules.job_cards.service import JobCardService, to_flow_schema
from app.modules.notifications.models import OutboxEvent
from app.modules.notifications.service import enqueue_intent
from app.modules.slots.models import SlotHold
from app.modules.vehicles.models import Vehicle
from app.modules.visits.models import Visit


def _aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


def format_slot_display(starts: datetime, ends: datetime) -> str:
    local_start = _aware(starts).astimezone(IST)
    local_end = _aware(ends).astimezone(IST)
    return (
        f"{local_start.strftime('%a')} {local_start.day} · "
        f"{local_start.strftime('%H:%M')} – {local_end.strftime('%H:%M')}"
    )


class BookingService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.job_cards = JobCardService(db)

    def _to_booking_out(
        self, booking: Booking, job_card_ref: str, vehicle: str, address: str
    ) -> BookingOut:
        job = self.db.get(JobCard, booking.job_card_id)
        progress = customer_progress(job) if job is not None else "BOOKING_CONFIRMED"
        note = "We'll assign a van before your visit."
        if booking.visit_type == "INSPECTION":
            note = "Our technician will inspect your car and send findings for your approval."
        elif booking.visit_type == "REPAIR":
            note = "Our technician will complete the approved repair on visit 2."
        return BookingOut(
            id=booking.id,
            public_ref=booking.public_ref,
            status=booking.status,
            slot=SlotSummary(
                starts_at=_aware(booking.slot_starts_at),
                ends_at=_aware(booking.slot_ends_at),
                display=format_slot_display(booking.slot_starts_at, booking.slot_ends_at),
            ),
            job_card_ref=job_card_ref,
            job_card_id=booking.job_card_id,
            vehicle_summary=vehicle,
            address_summary=address,
            customer_progress=progress,
            note=note,
        )

    def _create_visit(self, booking: Booking, job_card: JobCard, visit_type: str) -> Visit:
        existing = list(
            self.db.scalars(select(Visit).where(Visit.job_card_id == job_card.id)).all()
        )
        visit = Visit(
            public_ref=next_visit_ref(self.db, job_card.public_ref, 1 + len(existing)),
            booking_id=booking.id,
            job_card_id=job_card.id,
            visit_type=visit_type,
            status="SCHEDULED",
            scheduled_start_at=booking.slot_starts_at,
            scheduled_end_at=booking.slot_ends_at,
            timezone=booking.timezone or "Asia/Kolkata",
            scope_lines=[],
        )
        self.db.add(visit)
        self.db.flush()
        if visit_type == "INSPECTION":
            job_card.inspection_visit_id = visit.id
        elif visit_type == "REPAIR":
            job_card.repair_visit_id = visit.id
        return visit

    def confirm(
        self,
        job_card_id: str,
        hold_id: str,
        user: CurrentUser,
        request_id: str | None,
        visit_type: str | None = None,
    ) -> BookResponse:
        job_card = self.job_cards.get_accessible(job_card_id, user)
        self.job_cards.require_scope_confirmed(job_card)
        hold = self.db.get(SlotHold, hold_id)
        if hold is None or hold.job_card_id != job_card_id or hold.profile_id != user.id:
            raise DomainProblem(404, "NOT_FOUND", "Not found.")
        expires = _aware(hold.expires_at)
        if hold.status != "ACTIVE" or expires < datetime.now(UTC):
            if hold.status == "ACTIVE":
                hold.status = "EXPIRED"
                self.db.commit()
            raise DomainProblem(
                409,
                "HOLD_EXPIRED",
                "That time hold expired. Pick another slot.",
                retryable=True,
                allowed_actions=["LIST_SLOTS"],
            )
        if job_card.status != "READY_TO_BOOK":
            raise DomainProblem(
                409,
                "INVALID_STATE_TRANSITION",
                "Job card is not ready to book.",
                allowed_actions=["LIST_SLOTS", "FINALIZE"],
            )

        resolved_visit = visit_type or (
            "INSPECTION" if job_card.flow_policy == "INSPECTION_REPAIR" else "SERVICE"
        )
        if job_card.flow_policy == "INSPECTION_REPAIR" and resolved_visit != "INSPECTION":
            raise DomainProblem(
                409,
                "VISIT_TYPE_MISMATCH",
                "Visit 1 must be booked as an inspection.",
                allowed_actions=["SELECT_SLOT"],
            )
        if job_card.flow_policy != "INSPECTION_REPAIR" and resolved_visit == "INSPECTION":
            raise DomainProblem(
                409,
                "VISIT_TYPE_MISMATCH",
                "Inspection visits are only for inspection + repair.",
                allowed_actions=["SELECT_SLOT"],
            )

        profile = self.db.get(Profile, user.id)
        vehicle = self.db.get(Vehicle, job_card.vehicle_id) if job_card.vehicle_id else None
        address = self.db.get(Address, job_card.address_id) if job_card.address_id else None
        offering = self.db.get(ServiceOffering, job_card.service_offering_id)
        estimate = None
        if job_card.accepted_estimate_id:
            estimate = self.job_cards.estimates.get(job_card.accepted_estimate_id)
        if estimate is None:
            estimate = self.job_cards.estimates.latest_for_job(job_card.id)

        ctx = job_card.vehicle_context or {}
        vehicle_summary = (
            f"{ctx.get('make', '')} {ctx.get('model', '')} {ctx.get('year', '')}".strip()
        )
        if ctx.get("fuel_type"):
            vehicle_summary = f"{vehicle_summary} · {str(ctx['fuel_type']).title()}"
        address_summary = address.locality if address else "Koramangala"

        booking = Booking(
            public_ref=next_booking_ref(self.db),
            job_card_id=job_card.id,
            profile_id=user.id,
            status="CONFIRMED",
            slot_starts_at=hold.slot_starts_at,
            slot_ends_at=hold.slot_ends_at,
            timezone="Asia/Kolkata",
            visit_type=resolved_visit
            if resolved_visit != "SERVICE"
            else ("ONE_MAN" if job_card.flow_policy == "ONE_MAN" else "SERVICE"),
        )
        self.db.add(booking)
        self.db.flush()
        snapshot = BookingSnapshot(
            booking_id=booking.id,
            customer_snapshot={
                "id": user.id,
                "full_name": profile.full_name if profile else None,
                "phone": profile.phone if profile else None,
            },
            address_snapshot={
                "id": address.id if address else None,
                "line1": address.line1 if address else None,
                "locality": address.locality if address else None,
                "city": address.city if address else None,
                "postal_code": address.postal_code if address else None,
            },
            vehicle_snapshot=ctx
            if not vehicle
            else {
                "id": vehicle.id,
                "make": vehicle.make,
                "model": vehicle.model,
                "year": vehicle.year,
                "fuel_type": vehicle.fuel_type,
                "transmission": vehicle.transmission,
            },
            estimate_snapshot={
                "id": estimate.id if estimate else None,
                "total_minor": estimate.total_minor if estimate else None,
                "currency": estimate.currency if estimate else "INR",
                "content_hash": estimate.content_hash if estimate else None,
                "line_items": [
                    {
                        "label": line.label,
                        "amount_minor": line.amount_minor,
                        "kind": line.kind,
                        "is_included": line.is_included,
                    }
                    for line in (estimate.line_items if estimate else [])
                ],
            },
            offering_snapshot={
                "id": offering.id if offering else None,
                "slug": offering.slug if offering else None,
                "name": offering.name if offering else None,
            },
            flow_policy=job_card.flow_policy,
        )
        self.db.add(snapshot)
        hold.status = "CONSUMED"
        if job_card.flow_policy == "INSPECTION_REPAIR":
            state_machine.transition(job_card, "INSPECTION_BOOKED")
            visit = self._create_visit(booking, job_card, "INSPECTION")
            self.job_cards.repo.add_event(
                job_card.id,
                "INSPECTION_BOOKED",
                actor_profile_id=user.id,
                request_id=request_id,
                payload={"visit_id": visit.id},
            )
            self.db.add(
                OutboxEvent(
                    event_type="inspection_booked",
                    payload={"job_card_id": job_card.id, "booking_id": booking.id},
                )
            )
        else:
            state_machine.transition(job_card, "BOOKING_CREATED")
        job_card.updated_at = datetime.now(UTC)
        self.job_cards.repo.add_event(
            job_card.id,
            "BOOKED",
            actor_profile_id=user.id,
            request_id=request_id,
            payload={"booking_id": booking.id},
        )
        enqueue_intent(
            self.db,
            profile_id=booking.profile_id,
            intent="slot_confirmed",
            entity_type="booking",
            entity_id=booking.id,
            context={
                "service_name": offering.name if offering else "your vehicle",
                "booking_id": booking.id,
            },
            request_id=request_id,
        )
        self.db.commit()
        self.db.refresh(booking)
        loaded = self.job_cards.repo.get(job_card.id)
        assert loaded is not None
        decision = build_flow_decision(loaded, estimate, has_active_hold=False)
        return BookResponse(
            booking=self._to_booking_out(
                booking, job_card.public_ref, vehicle_summary, address_summary
            ),
            flow_decision=to_flow_schema(decision),
        )

    def get(self, booking_id: str, user: CurrentUser) -> BookingDetailResponse:
        booking = self.db.scalar(
            select(Booking).where(Booking.id == booking_id).options(selectinload(Booking.snapshot))
        )
        if booking is None or (booking.profile_id != user.id and user.role != "admin"):
            raise DomainProblem(404, "NOT_FOUND", "Not found.")
        job_card = self.job_cards.repo.get(booking.job_card_id)
        ctx = job_card.vehicle_context if job_card else {}
        vehicle_summary = (
            f"{ctx.get('make', '')} {ctx.get('model', '')} {ctx.get('year', '')}".strip()
        )
        snapshot = booking.snapshot
        address_summary = "Koramangala"
        if snapshot and isinstance(snapshot.address_snapshot, dict):
            address_summary = snapshot.address_snapshot.get("locality") or address_summary
        if snapshot and isinstance(snapshot.vehicle_snapshot, dict):
            vs = snapshot.vehicle_snapshot
            vehicle_summary = (
                f"{vs.get('make', '')} {vs.get('model', '')} {vs.get('year', '')}".strip()
            )
        visits = self._visit_summaries(booking.job_card_id)
        composed = self._compose_progress(booking, job_card, visits)
        booking_out = self._to_booking_out(
            booking,
            job_card.public_ref if job_card else booking.public_ref,
            vehicle_summary,
            address_summary,
        )
        booking_out.customer_progress = composed["progress"].key
        return BookingDetailResponse(
            booking=booking_out,
            snapshot={
                "customer": snapshot.customer_snapshot if snapshot else {},
                "address": snapshot.address_snapshot if snapshot else {},
                "vehicle": snapshot.vehicle_snapshot if snapshot else {},
                "estimate": snapshot.estimate_snapshot if snapshot else {},
                "offering": snapshot.offering_snapshot if snapshot else {},
                "flow_policy": (
                    snapshot.flow_policy if snapshot else job_card.flow_policy if job_card else None
                ),
                "offering_slug": (
                    (snapshot.offering_snapshot or {}).get("slug") if snapshot else None
                ),
                "confirmation_copy_key": (
                    "one_man_confirmed" if snapshot and snapshot.flow_policy == "ONE_MAN" else None
                ),
                "visits": visits,
            },
            customer_progress=CustomerProgressOut(
                key=composed["progress"].key,
                headline=composed["progress"].headline,
                subheadline=composed["progress"].subheadline,
                steps=[
                    ProgressStepOut(key=s.key, label=s.label, status=s.status)
                    for s in composed["progress"].steps
                ],
                primary_action=composed["progress"].primary_action,
            ),
            allowed_actions=composed["actions"],
            visits=visits,
            invoice=composed["invoice_summary"],
            review_submitted=composed["review_submitted"],
        )

    def _compose_progress(self, booking: Booking, job_card, visits: list[dict]) -> dict:
        from app.modules.bookings.progress_composer import (
            compose_customer_progress,
            derive_allowed_actions,
        )
        from app.modules.inspection_repair.progress import customer_progress as ir_progress
        from app.modules.invoices.repository import InvoiceRepository
        from app.modules.invoices.service import InvoiceService
        from app.modules.payments.models import Payment
        from app.modules.reviews.models import Review

        invoice = InvoiceRepository(self.db).get_by_booking(booking.id)
        if invoice is None:
            invoice = InvoiceService(self.db)._invoice_for_job(booking)
        payments = list(
            self.db.scalars(select(Payment).where(Payment.job_card_id == booking.job_card_id)).all()
        )
        review = self.db.scalar(select(Review).where(Review.booking_id == booking.id))
        ir_key = ir_progress(job_card) if job_card is not None else None
        progress = compose_customer_progress(
            booking_status=booking.status,
            job_status=job_card.status if job_card else None,
            flow_policy=job_card.flow_policy if job_card else None,
            visit_states=[str(row.get("status")) for row in visits],
            invoice_status=invoice.status if invoice else None,
            invoice_balance_minor=invoice.balance_minor if invoice else 0,
            payment_statuses=[row.status for row in payments],
            review_submitted=review is not None,
            ir_progress=ir_key,
        )
        actions = derive_allowed_actions(
            invoice_status=invoice.status if invoice else None,
            invoice_balance_minor=invoice.balance_minor if invoice else 0,
            payment_statuses=[row.status for row in payments],
            review_submitted=review is not None,
            progress_key=progress.key,
            visit_states=[str(row.get("status")) for row in visits],
        )
        return {
            "progress": progress,
            "actions": actions,
            "invoice_summary": InvoiceService(self.db).summary(invoice),
            "review_submitted": review is not None,
        }

    def _visit_summaries(self, job_card_id: str) -> list[dict]:
        visits = list(
            self.db.scalars(
                select(Visit)
                .where(Visit.job_card_id == job_card_id)
                .order_by(Visit.scheduled_start_at)
            ).all()
        )
        return [
            {
                "id": visit.id,
                "visit_type": visit.visit_type,
                "status": visit.status,
                "scheduled_start_at": _aware(visit.scheduled_start_at).isoformat(),
                "scheduled_end_at": _aware(visit.scheduled_end_at).isoformat(),
            }
            for visit in visits
        ]

    def book_repair(
        self,
        job_card_id: str,
        hold_id: str,
        user: CurrentUser,
        request_id: str | None,
    ) -> BookResponse:
        from app.modules.inspection_repair.service import InspectionRepairService

        job_card = self.job_cards.get_accessible(job_card_id, user)
        allowed, reason = InspectionRepairService(self.db).can_book_repair_visit(job_card)
        if not allowed:
            actions = {
                "PARTS_ADVANCE_REQUIRED": ["PAY_PARTS_ADVANCE"],
                "PARTS_NOT_READY": ["VIEW_PARTS_STATUS"],
                "ESTIMATE_EXPIRED": ["CONTACT_SUPPORT"],
                "TWO_VISIT_POLICY_VIOLATION": ["CONTACT_SUPPORT"],
            }.get(reason, ["VIEW_BOOKING"])
            raise DomainProblem(
                409,
                reason,
                "Repair visit cannot be booked yet.",
                allowed_actions=actions,
            )
        hold = self.db.get(SlotHold, hold_id)
        if hold is None or hold.job_card_id != job_card_id or hold.profile_id != user.id:
            raise DomainProblem(404, "NOT_FOUND", "Not found.")
        expires = _aware(hold.expires_at)
        if hold.status != "ACTIVE" or expires < datetime.now(UTC):
            if hold.status == "ACTIVE":
                hold.status = "EXPIRED"
                self.db.commit()
            raise DomainProblem(
                409,
                "HOLD_EXPIRED",
                "That time hold expired. Pick another slot.",
                retryable=True,
                allowed_actions=["LIST_SLOTS"],
            )
        profile = self.db.get(Profile, user.id)
        vehicle = self.db.get(Vehicle, job_card.vehicle_id) if job_card.vehicle_id else None
        address = self.db.get(Address, job_card.address_id) if job_card.address_id else None
        offering = self.db.get(ServiceOffering, job_card.service_offering_id)
        estimate = None
        if job_card.accepted_inspection_estimate_id:
            estimate = self.job_cards.estimates.get(job_card.accepted_inspection_estimate_id)
        ctx = job_card.vehicle_context or {}
        vehicle_summary = (
            f"{ctx.get('make', '')} {ctx.get('model', '')} {ctx.get('year', '')}".strip()
        )
        address_summary = address.locality if address else "Koramangala"
        booking = Booking(
            public_ref=next_booking_ref(self.db),
            job_card_id=job_card.id,
            profile_id=user.id,
            status="CONFIRMED",
            slot_starts_at=hold.slot_starts_at,
            slot_ends_at=hold.slot_ends_at,
            timezone="Asia/Kolkata",
            visit_type="REPAIR",
        )
        self.db.add(booking)
        self.db.flush()
        snapshot = BookingSnapshot(
            booking_id=booking.id,
            customer_snapshot={
                "id": user.id,
                "full_name": profile.full_name if profile else None,
                "phone": profile.phone if profile else None,
            },
            address_snapshot={
                "id": address.id if address else None,
                "line1": address.line1 if address else None,
                "locality": address.locality if address else None,
                "city": address.city if address else None,
                "postal_code": address.postal_code if address else None,
            },
            vehicle_snapshot=ctx
            if not vehicle
            else {
                "id": vehicle.id,
                "make": vehicle.make,
                "model": vehicle.model,
                "year": vehicle.year,
                "fuel_type": vehicle.fuel_type,
                "transmission": vehicle.transmission,
            },
            estimate_snapshot={
                "id": estimate.id if estimate else None,
                "total_minor": estimate.total_minor if estimate else None,
                "currency": estimate.currency if estimate else "INR",
                "content_hash": estimate.content_hash if estimate else None,
                "accepted_inspection_estimate_id": job_card.accepted_inspection_estimate_id,
                "line_items": [
                    {
                        "label": line.label,
                        "amount_minor": line.amount_minor,
                        "kind": line.kind,
                        "is_included": line.is_included,
                    }
                    for line in (estimate.line_items if estimate else [])
                ],
            },
            offering_snapshot={
                "id": offering.id if offering else None,
                "slug": offering.slug if offering else None,
                "name": offering.name if offering else None,
            },
            flow_policy=job_card.flow_policy,
        )
        self.db.add(snapshot)
        hold.status = "CONSUMED"
        visit = self._create_visit(booking, job_card, "REPAIR")
        state_machine.transition(job_card, "REPAIR_BOOKED")
        job_card.updated_at = datetime.now(UTC)
        self.job_cards.repo.add_event(
            job_card.id,
            "REPAIR_BOOKED",
            actor_profile_id=user.id,
            request_id=request_id,
            payload={"booking_id": booking.id, "visit_id": visit.id},
        )
        self.db.add(
            OutboxEvent(
                event_type="repair_booked",
                payload={"job_card_id": job_card.id, "booking_id": booking.id},
            )
        )
        enqueue_intent(
            self.db,
            profile_id=booking.profile_id,
            intent="slot_confirmed",
            entity_type="booking",
            entity_id=booking.id,
            context={
                "service_name": offering.name if offering else "your vehicle",
                "booking_id": booking.id,
            },
            request_id=request_id,
        )
        self.db.commit()
        self.db.refresh(booking)
        loaded = self.job_cards.repo.get(job_card.id)
        assert loaded is not None
        decision = build_flow_decision(loaded, estimate, has_active_hold=False)
        return BookResponse(
            booking=self._to_booking_out(
                booking, job_card.public_ref, vehicle_summary, address_summary
            ),
            flow_decision=to_flow_schema(decision),
        )

    def reschedule(
        self,
        booking_id: str,
        hold_id: str,
        user: CurrentUser,
        request_id: str | None,
    ) -> BookResponse:
        from app.modules.inspection_repair.service import InspectionRepairService

        booking = self.db.get(Booking, booking_id)
        if booking is None or (booking.profile_id != user.id and user.role != "admin"):
            raise DomainProblem(404, "NOT_FOUND", "Not found.")
        if booking.visit_type != "REPAIR":
            raise DomainProblem(
                409,
                "VISIT_TYPE_MISMATCH",
                "Only repair visits can be rescheduled in this phase.",
                allowed_actions=["CONTACT_SUPPORT"],
            )
        job_card = self.job_cards.get_accessible(booking.job_card_id, user)
        estimate_id = job_card.accepted_inspection_estimate_id
        preserved = estimate_id
        estimate = self.job_cards.estimates.get(estimate_id) if estimate_id else None
        if estimate is None or estimate.status != "ACCEPTED":
            raise DomainProblem(
                409,
                "ESTIMATE_EXPIRED",
                "Approved estimate is no longer valid.",
                allowed_actions=["CONTACT_SUPPORT"],
            )
        expires = _aware(estimate.expires_at) if estimate.expires_at else None
        if expires is not None and expires < datetime.now(UTC):
            raise DomainProblem(
                409,
                "ESTIMATE_EXPIRED",
                "Approved estimate expired. Contact support.",
                allowed_actions=["CONTACT_SUPPORT"],
            )
        allowed, reason = InspectionRepairService(self.db).can_book_repair_visit(job_card)
        if not allowed and reason not in {"TWO_VISIT_POLICY_VIOLATION", "INVALID_STATE_TRANSITION"}:
            raise DomainProblem(
                409,
                reason,
                "Cannot reschedule this repair visit.",
                allowed_actions=["CONTACT_SUPPORT"],
            )
        if job_card.status not in {"REPAIR_BOOKED", "REPAIR_BOOKING_REQUIRED"}:
            if job_card.status != "REPAIR_BOOKED":
                raise DomainProblem(
                    409,
                    "INVALID_STATE_TRANSITION",
                    "Repair visit cannot be rescheduled.",
                    allowed_actions=["VIEW_BOOKING"],
                )
        hold = self.db.get(SlotHold, hold_id)
        if hold is None or hold.job_card_id != job_card.id or hold.profile_id != user.id:
            raise DomainProblem(404, "NOT_FOUND", "Not found.")
        if hold.status != "ACTIVE":
            raise DomainProblem(409, "HOLD_EXPIRED", "That time hold expired.", retryable=True)
        booking.slot_starts_at = hold.slot_starts_at
        booking.slot_ends_at = hold.slot_ends_at
        hold.status = "CONSUMED"
        visit = self.db.scalar(select(Visit).where(Visit.booking_id == booking.id))
        if visit is not None:
            visit.scheduled_start_at = booking.slot_starts_at
            visit.scheduled_end_at = booking.slot_ends_at
        job_card.accepted_inspection_estimate_id = preserved
        job_card.updated_at = datetime.now(UTC)
        self.job_cards.repo.add_event(
            job_card.id,
            "REPAIR_RESCHEDULED",
            actor_profile_id=user.id,
            request_id=request_id,
            payload={"booking_id": booking.id, "estimate_id": preserved},
        )
        self.db.commit()
        ctx = job_card.vehicle_context or {}
        vehicle_summary = (
            f"{ctx.get('make', '')} {ctx.get('model', '')} {ctx.get('year', '')}".strip()
        )
        loaded = self.job_cards.repo.get(job_card.id)
        assert loaded is not None
        return BookResponse(
            booking=self._to_booking_out(
                booking, job_card.public_ref, vehicle_summary, "Koramangala"
            ),
            flow_decision=to_flow_schema(build_flow_decision(loaded, estimate)),
        )
