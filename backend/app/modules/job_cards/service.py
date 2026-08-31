from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common.errors import DomainProblem
from app.core.deps import CurrentUser
from app.core.flow_decision import FlowDecision, build_flow_decision
from app.core.refs import next_job_card_ref
from app.core.schemas import FlowDecisionSchema
from app.db.models import Profile, RepairOffering, ServiceAreaRule, ServiceOffering
from app.modules.addresses.models import Address
from app.modules.bookings.models import Booking
from app.modules.estimates.models import Estimate
from app.modules.estimates.repository import EstimateRepository
from app.modules.job_cards import state_machine
from app.modules.job_cards.models import JobCard
from app.modules.job_cards.repository import JobCardRepository
from app.modules.job_cards.schemas import (
    AcceptanceOut,
    AcceptEstimateRequest,
    AcceptEstimateResponse,
    CreateJobCardRequest,
    EstimateLineOut,
    EstimateOut,
    FinalizationRequest,
    FinalizationResponse,
    JobCardConcernOut,
    JobCardEnvelope,
    JobCardItemOut,
    JobCardOut,
    MoneyOut,
    PatchJobCardRequest,
    PriceResponse,
    VehicleContext,
)
from app.modules.pricing.service import PricingService
from app.modules.slots.models import SlotHold
from app.modules.vehicles.models import Vehicle

DEFAULT_AREA_SLUG = "koramangala-bengaluru"


def _aware(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


def to_flow_schema(decision: FlowDecision) -> FlowDecisionSchema:
    return FlowDecisionSchema(
        policy=decision.policy,
        advisor_requirement=decision.advisor_requirement,
        estimate_requirement=decision.estimate_requirement,
        required_next_action=decision.required_next_action,
        allowed_actions=decision.allowed_actions,
        blocking_reasons=decision.blocking_reasons,
        estimate_version_id=decision.estimate_version_id,
        expires_at=_aware(decision.expires_at),
        customer_progress=decision.customer_progress,
    )


class JobCardService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = JobCardRepository(db)
        self.estimates = EstimateRepository(db)
        self.pricing = PricingService(db)

    def _offering(self, slug: str, *, policies: set[str]) -> ServiceOffering:
        offering = self.db.scalar(
            select(ServiceOffering).where(
                ServiceOffering.slug == slug, ServiceOffering.is_active.is_(True)
            )
        )
        if offering is None:
            raise DomainProblem(422, "INVALID_OFFERING_FOR_FLOW", "Unknown service offering.")
        if offering.flow_policy not in policies:
            raise DomainProblem(
                422,
                "INVALID_OFFERING_FOR_FLOW",
                "Offering is not available on this flow.",
            )
        return offering

    def get_accessible(self, job_card_id: str, user: CurrentUser | None) -> JobCard:
        job_card = self.repo.get(job_card_id)
        if job_card is None:
            raise DomainProblem(404, "NOT_FOUND", "Not found.")
        if user is not None and user.role == "admin":
            return job_card
        if job_card.profile_id is None:
            return job_card
        if user is None or job_card.profile_id != user.id:
            raise DomainProblem(404, "NOT_FOUND", "Not found.")
        if user.role not in {"customer", "admin"}:
            raise DomainProblem(403, "FORBIDDEN", "Insufficient role.")
        return job_card

    def _active_hold(self, job_card_id: str) -> SlotHold | None:
        now = datetime.now(UTC)
        holds = self.db.scalars(
            select(SlotHold).where(SlotHold.job_card_id == job_card_id, SlotHold.status == "ACTIVE")
        ).all()
        for hold in holds:
            expires = _aware(hold.expires_at) or now
            if expires < now:
                hold.status = "EXPIRED"
                continue
            return hold
        return None

    def _decision(self, job_card: JobCard, estimate: Estimate | None = None) -> FlowDecision:
        if estimate is None:
            estimate = self.estimates.latest_for_job(job_card.id)
        from app.modules.advisor.repository import AdvisorRepository

        case = AdvisorRepository(self.db).get_by_job_card_id(job_card.id)
        return build_flow_decision(
            job_card,
            estimate,
            has_active_hold=self._active_hold(job_card.id) is not None,
            advisor_case=case,
        )

    def require_scope_confirmed(self, job_card: JobCard) -> None:
        if not any(item.kind == "REPAIR" for item in job_card.items):
            return
        from app.modules.advisor.repository import AdvisorRepository

        case = AdvisorRepository(self.db).get_by_job_card_id(job_card.id)
        if case is None or case.status != "CONFIRMED":
            raise DomainProblem(
                409,
                "ADVISOR_CASE_REQUIRED",
                "Advisor must confirm repair scope before booking.",
                allowed_actions=["WAIT_FOR_ADVISOR", "ACCEPT_REVISED_ESTIMATE"],
            )

    def to_job_card_out(self, job_card: JobCard) -> JobCardOut:
        from app.modules.inspection_repair.progress import customer_progress
        from app.modules.parts.service import PartsService

        ctx = job_card.vehicle_context or {}
        booking_id = self.db.scalar(
            select(Booking.id)
            .where(Booking.job_card_id == job_card.id)
            .order_by(Booking.created_at.desc())
        )
        progress = customer_progress(job_card)
        parts_status = None
        if job_card.flow_policy == "INSPECTION_REPAIR":
            parts_status = PartsService(self.db).status_payload(job_card)
        return JobCardOut(
            id=job_card.id,
            public_ref=job_card.public_ref,
            status=job_card.status,
            flow_policy=job_card.flow_policy,
            vehicle_context=VehicleContext.model_validate(ctx),
            items=[
                JobCardItemOut(
                    id=item.id,
                    kind=item.kind,
                    label=item.label_snapshot,
                    unit_price_minor=item.unit_price_minor,
                    currency=item.currency,
                    repair_offering_slug=(
                        self.db.get(RepairOffering, item.repair_offering_id).slug
                        if item.repair_offering_id
                        and self.db.get(RepairOffering, item.repair_offering_id)
                        else None
                    ),
                )
                for item in sorted(job_card.items, key=lambda row: row.created_at)
            ],
            concerns=[
                JobCardConcernOut(id=row.id, text=row.text)
                for row in sorted(job_card.concerns, key=lambda row: row.sort_order)
            ],
            vehicle_id=job_card.vehicle_id,
            address_id=job_card.address_id,
            booking_id=booking_id,
            customer_progress=progress,
            parts_status=parts_status,
            inspection_visit_id=job_card.inspection_visit_id,
            repair_visit_id=job_card.repair_visit_id,
            accepted_inspection_estimate_id=job_card.accepted_inspection_estimate_id,
        )

    def to_estimate_out(self, estimate: Estimate) -> EstimateOut:
        lines = sorted(estimate.line_items, key=lambda row: row.sort_order)
        return EstimateOut(
            id=estimate.id,
            version=estimate.version,
            status=estimate.status,
            total=MoneyOut(amount_minor=estimate.total_minor, currency=estimate.currency),
            expires_at=_aware(estimate.expires_at),
            content_hash=estimate.content_hash,
            source=getattr(estimate, "source", None),
            parts_advance_amount_minor=getattr(estimate, "parts_advance_amount_minor", None),
            line_items=[
                EstimateLineOut(
                    label=line.label,
                    amount_minor=line.amount_minor,
                    kind=line.kind,
                    is_included=line.is_included,
                    was_amount_minor=line.was_amount_minor,
                    change_type=line.change_type,
                    repair_offering_slug=line.repair_offering_slug,
                )
                for line in lines
            ],
        )

    def create(
        self,
        body: CreateJobCardRequest,
        user: CurrentUser | None,
        request_id: str | None,
    ) -> JobCardEnvelope:
        offering = self._offering(
            body.service_offering_slug, policies={"GENERAL_SERVICE", "ONE_MAN", "INSPECTION_REPAIR"}
        )
        if offering.flow_policy == "ONE_MAN" and body.concerns:
            raise DomainProblem(
                422,
                "ONE_MAN_CONCERNS_NOT_ALLOWED",
                "One-man jobs use a fixed catalog scope.",
            )
        area = self.db.scalar(
            select(ServiceAreaRule).where(
                ServiceAreaRule.slug == DEFAULT_AREA_SLUG, ServiceAreaRule.is_active.is_(True)
            )
        )
        job_card = JobCard(
            id=str(uuid4()),
            public_ref=next_job_card_ref(self.db),
            profile_id=user.id if user is not None else None,
            service_offering_id=offering.id,
            flow_policy=offering.flow_policy,
            status="EDITABLE",
            vehicle_context=body.vehicle_context.model_dump(),
            service_area_id=area.id if area else None,
        )
        self.db.add(job_card)
        self.db.flush()
        if offering.flow_policy != "INSPECTION_REPAIR":
            self.repo.add_service_item(
                job_card.id,
                offering.id,
                offering.name,
                offering.display_price_minor or 0,
            )
        if offering.flow_policy != "ONE_MAN":
            self.repo.replace_concerns(job_card, [row.text for row in body.concerns])
        if body.photo_asset_ids:
            from app.modules.media.models import MediaAsset

            for asset_id in body.photo_asset_ids[:6]:
                asset = self.db.get(MediaAsset, asset_id)
                if asset is None:
                    continue
                if user is not None and asset.uploader_profile_id != user.id:
                    continue
                asset.job_card_id = job_card.id
        self.repo.add_event(
            job_card.id,
            "CREATED",
            actor_profile_id=user.id if user else None,
            request_id=request_id,
        )
        if offering.flow_policy == "ONE_MAN":
            from app.modules.job_cards.one_man_policy import auto_accept_estimate

            state_machine.transition(job_card, "PRICING")
            estimate = self.pricing.build_estimate(job_card)
            state_machine.transition(job_card, "ESTIMATE_READY")
            auto_accept_estimate(self.db, job_card, estimate)
            self.repo.add_event(
                job_card.id,
                "PRICED",
                actor_profile_id=user.id if user else None,
                request_id=request_id,
                payload={"estimate_id": estimate.id, "source": "AUTO_CATALOG"},
            )
        self.db.commit()
        loaded = self.repo.get(job_card.id)
        assert loaded is not None
        return JobCardEnvelope(
            job_card=self.to_job_card_out(loaded),
            flow_decision=to_flow_schema(self._decision(loaded)),
        )

    def get_envelope(self, job_card_id: str, user: CurrentUser | None) -> JobCardEnvelope:
        job_card = self.get_accessible(job_card_id, user)
        return JobCardEnvelope(
            job_card=self.to_job_card_out(job_card),
            flow_decision=to_flow_schema(self._decision(job_card)),
        )

    def patch(
        self,
        job_card_id: str,
        body: PatchJobCardRequest,
        user: CurrentUser | None,
        request_id: str | None,
    ) -> JobCardEnvelope:
        job_card = self.get_accessible(job_card_id, user)
        if job_card.status not in {"EDITABLE", "ESTIMATE_READY", "PRICING_FAILED"}:
            raise DomainProblem(
                409,
                "INVALID_STATE_TRANSITION",
                "Job card can no longer be edited.",
                allowed_actions=state_machine._recovery_actions(job_card.status),
            )
        self.repo.replace_concerns(job_card, [row.text for row in body.concerns])
        job_card.updated_at = datetime.now(UTC)
        self.repo.add_event(
            job_card.id,
            "CONCERNS_UPDATED",
            actor_profile_id=user.id if user else None,
            request_id=request_id,
        )
        self.db.commit()
        loaded = self.repo.get(job_card.id)
        assert loaded is not None
        return JobCardEnvelope(
            job_card=self.to_job_card_out(loaded),
            flow_decision=to_flow_schema(self._decision(loaded)),
        )

    def price(
        self, job_card_id: str, user: CurrentUser | None, request_id: str | None
    ) -> PriceResponse:
        job_card = self.get_accessible(job_card_id, user)
        if job_card.flow_policy == "INSPECTION_REPAIR":
            raise DomainProblem(
                409,
                "INVALID_STATE_TRANSITION",
                "Repair price is published after inspection.",
                allowed_actions=["FINALIZE", "VIEW_BOOKING"],
            )
        if job_card.status == "ESTIMATE_READY":
            state_machine.transition(job_card, "PRICING")
        elif job_card.status != "PRICING":
            state_machine.transition(job_card, "PRICING")
        estimate = self.pricing.build_estimate(job_card)
        state_machine.transition(job_card, "ESTIMATE_READY")
        if job_card.flow_policy == "ONE_MAN":
            from app.modules.job_cards.one_man_policy import auto_accept_estimate

            auto_accept_estimate(self.db, job_card, estimate)
        job_card.updated_at = datetime.now(UTC)
        self.repo.add_event(
            job_card.id,
            "PRICED",
            actor_profile_id=user.id if user else None,
            request_id=request_id,
            payload={"estimate_id": estimate.id, "total_minor": estimate.total_minor},
        )
        self.db.commit()
        loaded = self.repo.get(job_card.id)
        assert loaded is not None
        estimate = self.estimates.get(estimate.id)
        assert estimate is not None
        return PriceResponse(
            estimate=self.to_estimate_out(estimate),
            flow_decision=to_flow_schema(self._decision(loaded, estimate)),
        )

    def accept(
        self,
        job_card_id: str,
        estimate_id: str,
        body: AcceptEstimateRequest,
        user: CurrentUser | None,
        idempotency_key: str,
        request_id: str | None,
    ) -> AcceptEstimateResponse:
        job_card = self.get_accessible(job_card_id, user)
        estimate = self.estimates.get(estimate_id)
        if estimate is None or estimate.job_card_id != job_card.id:
            raise DomainProblem(404, "NOT_FOUND", "Not found.")
        expires = _aware(estimate.expires_at)
        if estimate.status == "EXPIRED" or (expires is not None and expires < datetime.now(UTC)):
            estimate.status = "EXPIRED"
            self.db.commit()
            raise DomainProblem(
                409,
                "ESTIMATE_EXPIRED",
                "Estimate expired. Request a new estimate.",
                retryable=True,
                allowed_actions=["REQUEST_ESTIMATE"],
            )
        if estimate.status != "READY":
            raise DomainProblem(
                409,
                "INVALID_STATE_TRANSITION",
                "Estimate is not ready to accept.",
                allowed_actions=["REQUEST_ESTIMATE", "EDIT_JOB_CARD"],
            )
        if body.expected_total_minor != estimate.total_minor:
            raise DomainProblem(
                409,
                "INVALID_STATE_TRANSITION",
                "Estimate total does not match.",
                allowed_actions=["REQUEST_ESTIMATE"],
            )
        if body.expected_content_hash != estimate.content_hash:
            raise DomainProblem(
                409,
                "INVALID_STATE_TRANSITION",
                "Estimate content does not match.",
                allowed_actions=["REQUEST_ESTIMATE"],
            )
        has_repairs = any(item.kind == "REPAIR" for item in job_card.items)
        from app.modules.advisor.repository import AdvisorRepository

        advisor_repo = AdvisorRepository(self.db)
        case = advisor_repo.get_by_job_card_id(job_card.id)
        if job_card.flow_policy == "INSPECTION_REPAIR":
            from app.modules.inspection_repair.service import InspectionRepairService

            if job_card.status != "REPAIR_APPROVAL_DUE":
                raise DomainProblem(
                    409,
                    "INVALID_STATE_TRANSITION",
                    "Estimate is not ready to accept.",
                    allowed_actions=["VIEW_FINDINGS"],
                )
            acceptance = self.estimates.add_acceptance(
                estimate.id,
                job_card.id,
                user.id if user is not None else None,
                estimate.total_minor,
                idempotency_key,
            )
            estimate.status = "ACCEPTED"
            target = InspectionRepairService(self.db).transition_on_estimate_accept(
                job_card, estimate
            )
            state_machine.transition(job_card, target)
            job_card.accepted_estimate_id = estimate.id
            job_card.accepted_inspection_estimate_id = estimate.id
            if user is not None and job_card.profile_id is None:
                job_card.profile_id = user.id
            job_card.updated_at = datetime.now(UTC)
            self.repo.add_event(
                job_card.id,
                "ESTIMATE_ACCEPTED",
                actor_profile_id=user.id if user else None,
                request_id=request_id,
                payload={"estimate_id": estimate.id},
            )
            self.db.commit()
            loaded = self.repo.get(job_card.id)
            assert loaded is not None
            return AcceptEstimateResponse(
                acceptance=AcceptanceOut(
                    id=acceptance.id,
                    accepted_at=_aware(acceptance.accepted_at) or datetime.now(UTC),
                    accepted_total_minor=acceptance.accepted_total_minor,
                ),
                flow_decision=to_flow_schema(self._decision(loaded, estimate)),
            )
        if has_repairs and job_card.status == "REVISED_ESTIMATE_PENDING":
            if case is None or case.pending_estimate_id != estimate.id:
                raise DomainProblem(
                    409,
                    "ESTIMATE_VERSION_MISMATCH",
                    "Accept the revised estimate sent during your call.",
                    allowed_actions=["ACCEPT_REVISED_ESTIMATE"],
                )
        acceptance = self.estimates.add_acceptance(
            estimate.id,
            job_card.id,
            user.id if user is not None else None,
            estimate.total_minor,
            idempotency_key,
        )
        estimate.status = "ACCEPTED"
        if has_repairs and job_card.status == "REVISED_ESTIMATE_PENDING":
            advisor_repo.transition(case, "CONFIRMED")
            case.confirmed_estimate_id = estimate.id
            case.pending_estimate_id = None
            case.customer_response = "ACCEPTED"
            state_machine.transition(job_card, "SCOPE_CONFIRMED")
            state_machine.transition(job_card, "READY_FOR_FINALIZATION")
        elif has_repairs:
            state_machine.transition(job_card, "ESTIMATE_ACCEPTED")
            state_machine.transition(job_card, "ADVISOR_REQUIRED")
        else:
            state_machine.transition(job_card, "ESTIMATE_ACCEPTED")
            state_machine.transition(job_card, "READY_FOR_FINALIZATION")
        job_card.accepted_estimate_id = estimate.id
        if user is not None and job_card.profile_id is None:
            job_card.profile_id = user.id
        job_card.updated_at = datetime.now(UTC)
        self.repo.add_event(
            job_card.id,
            "ESTIMATE_ACCEPTED",
            actor_profile_id=user.id if user else None,
            request_id=request_id,
            payload={"estimate_id": estimate.id},
        )
        self.db.commit()
        loaded = self.repo.get(job_card.id)
        assert loaded is not None
        return AcceptEstimateResponse(
            acceptance=AcceptanceOut(
                id=acceptance.id,
                accepted_at=_aware(acceptance.accepted_at) or datetime.now(UTC),
                accepted_total_minor=acceptance.accepted_total_minor,
            ),
            flow_decision=to_flow_schema(self._decision(loaded, estimate)),
        )

    def finalize(
        self,
        job_card_id: str,
        body: FinalizationRequest,
        user: CurrentUser,
        request_id: str | None,
    ) -> FinalizationResponse:
        job_card = self.get_accessible(job_card_id, user)
        if job_card.flow_policy != "INSPECTION_REPAIR":
            self.require_scope_confirmed(job_card)
        allowed_finalize = {
            "READY_FOR_FINALIZATION",
            "FINALIZATION_IN_PROGRESS",
            "READY_TO_BOOK",
        }
        if job_card.flow_policy == "INSPECTION_REPAIR":
            allowed_finalize.add("EDITABLE")
        if job_card.status not in allowed_finalize:
            raise DomainProblem(
                409,
                "INVALID_STATE_TRANSITION",
                "Job card is not ready to finalize.",
                allowed_actions=state_machine._recovery_actions(job_card.status),
            )
        area = (
            self.db.get(ServiceAreaRule, job_card.service_area_id)
            if job_card.service_area_id
            else None
        )
        if area is None:
            area = self.db.scalar(
                select(ServiceAreaRule).where(ServiceAreaRule.slug == DEFAULT_AREA_SLUG)
            )
        prefixes = list(area.postal_prefixes or []) if area else []
        if prefixes and body.address.postal_code not in prefixes:
            raise DomainProblem(
                422,
                "SERVICE_AREA_UNSUPPORTED",
                "This address is outside the current service area.",
                allowed_actions=["EDIT_ADDRESS", "SUPPORT"],
            )
        profile = self.db.get(Profile, user.id)
        assert profile is not None
        profile.full_name = body.customer.full_name
        profile.phone = body.customer.phone_e164
        profile.updated_at = datetime.now(UTC)

        if job_card.status == "READY_FOR_FINALIZATION":
            state_machine.transition(job_card, "FINALIZATION_IN_PROGRESS")
        elif job_card.flow_policy == "INSPECTION_REPAIR" and job_card.status == "EDITABLE":
            state_machine.transition(job_card, "FINALIZATION_IN_PROGRESS")

        address_id = job_card.address_id
        if body.save_address or address_id is None:
            address = Address(
                profile_id=user.id,
                line1=body.address.line1,
                line2=body.address.line2,
                locality=body.address.locality,
                city=body.address.city,
                postal_code=body.address.postal_code,
                latitude=body.address.latitude,
                longitude=body.address.longitude,
                is_default=True,
            )
            self.db.add(address)
            self.db.flush()
            address_id = address.id

        vehicle_id = job_card.vehicle_id
        if body.save_vehicle or vehicle_id is None:
            vehicle = Vehicle(
                profile_id=user.id,
                make=body.vehicle.make,
                model=body.vehicle.model,
                year=body.vehicle.year,
                fuel_type=body.vehicle.fuel_type,
                transmission=body.vehicle.transmission,
            )
            self.db.add(vehicle)
            self.db.flush()
            vehicle_id = vehicle.id

        job_card.address_id = address_id
        job_card.vehicle_id = vehicle_id
        job_card.vehicle_context = body.vehicle.model_dump()
        job_card.profile_id = user.id
        job_card.updated_at = datetime.now(UTC)
        if job_card.status != "READY_TO_BOOK":
            state_machine.transition(job_card, "READY_TO_BOOK")
        self.repo.add_event(
            job_card.id,
            "FINALIZED",
            actor_profile_id=user.id,
            request_id=request_id,
        )
        self.db.commit()
        loaded = self.repo.get(job_card.id)
        assert loaded is not None
        return FinalizationResponse(
            job_card=self.to_job_card_out(loaded),
            address_id=address_id or "",
            vehicle_id=vehicle_id or "",
            flow_decision=to_flow_schema(self._decision(loaded)),
        )

    def add_repair_item(
        self,
        job_card_id: str,
        slug: str,
        quantity: int,
        user: CurrentUser | None,
        request_id: str | None,
    ) -> JobCardEnvelope:
        job_card = self.get_accessible(job_card_id, user)
        if job_card.status not in {"EDITABLE", "ESTIMATE_READY", "PRICING_FAILED"}:
            raise DomainProblem(
                409,
                "INVALID_STATE_TRANSITION",
                "Repair items can only be changed while the job card is editable.",
                allowed_actions=["EDIT_JOB_CARD"],
            )
        offering = self.db.scalar(
            select(RepairOffering).where(
                RepairOffering.slug == slug, RepairOffering.is_active.is_(True)
            )
        )
        if offering is None:
            raise DomainProblem(422, "REPAIR_NOT_COMPATIBLE", "Unknown repair offering.")
        existing = next(
            (
                item
                for item in job_card.items
                if item.kind == "REPAIR" and item.repair_offering_id == offering.id
            ),
            None,
        )
        if existing is not None:
            raise DomainProblem(
                409, "INVALID_STATE_TRANSITION", "Repair is already on this job card."
            )
        if job_card.status == "ESTIMATE_READY":
            state_machine.transition(job_card, "EDITABLE")
        self.repo.add_repair_item(
            job_card.id, offering.id, offering.name, offering.display_price_minor, quantity
        )
        job_card.updated_at = datetime.now(UTC)
        self.repo.add_event(
            job_card.id,
            "REPAIR_ITEM_ADDED",
            actor_profile_id=user.id if user else None,
            request_id=request_id,
            payload={"slug": slug},
        )
        self.db.commit()
        loaded = self.repo.get(job_card.id)
        assert loaded is not None
        return JobCardEnvelope(
            job_card=self.to_job_card_out(loaded),
            flow_decision=to_flow_schema(self._decision(loaded)),
        )

    def delete_item(
        self,
        job_card_id: str,
        item_id: str,
        user: CurrentUser | None,
        request_id: str | None,
    ) -> JobCardEnvelope:
        job_card = self.get_accessible(job_card_id, user)
        if job_card.status not in {"EDITABLE", "ESTIMATE_READY", "PRICING_FAILED"}:
            raise DomainProblem(
                409,
                "INVALID_STATE_TRANSITION",
                "Repair items can only be changed while the job card is editable.",
                allowed_actions=["EDIT_JOB_CARD"],
            )
        item = next((row for row in job_card.items if row.id == item_id), None)
        if item is None:
            raise DomainProblem(404, "NOT_FOUND", "Not found.")
        if item.kind != "REPAIR":
            raise DomainProblem(409, "INVALID_STATE_TRANSITION", "Service line cannot be removed.")
        self.db.delete(item)
        if job_card.status == "ESTIMATE_READY":
            state_machine.transition(job_card, "EDITABLE")
        job_card.updated_at = datetime.now(UTC)
        self.repo.add_event(
            job_card.id,
            "REPAIR_ITEM_REMOVED",
            actor_profile_id=user.id if user else None,
            request_id=request_id,
            payload={"item_id": item_id},
        )
        self.db.commit()
        loaded = self.repo.get(job_card.id)
        assert loaded is not None
        return JobCardEnvelope(
            job_card=self.to_job_card_out(loaded),
            flow_decision=to_flow_schema(self._decision(loaded)),
        )
