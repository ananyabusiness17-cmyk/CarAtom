from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common.errors import DomainProblem
from app.core.deps import CurrentUser
from app.db.models import Profile, ServiceOffering
from app.modules.addresses.models import Address
from app.modules.admin.schemas import OnBehalfRequest, OnBehalfResponse
from app.modules.audit.service import AuditService
from app.modules.bookings.service import BookingService
from app.modules.job_cards.schemas import (
    AcceptEstimateRequest,
    AddressFinalization,
    ConcernIn,
    CreateJobCardRequest,
    CustomerFinalization,
    FinalizationRequest,
    VehicleContext,
)
from app.modules.job_cards.service import JobCardService
from app.modules.slots.service import SlotService
from app.modules.vehicles.models import Vehicle


def profile_as_user(profile: Profile) -> CurrentUser:
    return CurrentUser(
        id=profile.id,
        role=profile.role,
        phone=profile.phone,
        full_name=profile.full_name,
        phone_verified=True,
        created_at=profile.created_at or datetime.now(UTC),
        claims={},
    )


class OnBehalfBookingService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.jobs = JobCardService(db)
        self.audit = AuditService(db)

    def create(
        self, body: OnBehalfRequest, admin: CurrentUser, request_id: str | None
    ) -> OnBehalfResponse:
        customer = self.db.get(Profile, body.customer_profile_id)
        if customer is None or customer.role != "customer":
            raise DomainProblem(404, "CUSTOMER_NOT_FOUND", "Customer not found.")
        user = profile_as_user(customer)
        vehicle = None
        if body.vehicle_id:
            vehicle = self.db.get(Vehicle, body.vehicle_id)
            if vehicle is None or vehicle.profile_id != customer.id:
                raise DomainProblem(404, "NOT_FOUND", "Vehicle not found.")
        else:
            vehicle = self.db.scalar(select(Vehicle).where(Vehicle.profile_id == customer.id))
        if vehicle is None:
            raise DomainProblem(422, "VEHICLE_REQUIRED", "Customer has no saved vehicle.")
        address = None
        if body.address_id:
            address = self.db.get(Address, body.address_id)
        else:
            address = self.db.scalar(select(Address).where(Address.profile_id == customer.id))
        if address is None:
            raise DomainProblem(422, "ADDRESS_REQUIRED", "Customer has no saved address.")
        offering_row = self.db.scalar(
            select(ServiceOffering).where(ServiceOffering.slug == body.service_offering_slug)
        )
        concerns_in = []
        if offering_row is None or offering_row.flow_policy != "ONE_MAN":
            concerns_in = [
                ConcernIn(text=str(row.get("text") or "Walk-in WhatsApp request"))
                for row in body.concerns
            ] or [ConcernIn(text="Walk-in WhatsApp request")]
        created = self.jobs.create(
            CreateJobCardRequest(
                service_offering_slug=body.service_offering_slug,
                vehicle_context=VehicleContext(
                    make=vehicle.make,
                    model=vehicle.model,
                    year=vehicle.year,
                    fuel_type=vehicle.fuel_type,
                    transmission=vehicle.transmission,
                ),
                concerns=concerns_in,
            ),
            user,
            request_id,
        )
        job_id = created.job_card.id
        job = self.jobs.repo.get(job_id)
        assert job is not None
        if job.flow_policy == "ONE_MAN":
            # create() auto-accepted
            pass
        else:
            priced = self.jobs.price(job_id, user, request_id)
            self.jobs.accept(
                job_id,
                priced.estimate.id,
                AcceptEstimateRequest(
                    expected_total_minor=priced.estimate.total.amount_minor,
                    expected_content_hash=priced.estimate.content_hash,
                ),
                user,
                f"on-behalf-{job_id}",
                request_id,
            )
        self.jobs.finalize(
            job_id,
            FinalizationRequest(
                customer=CustomerFinalization(
                    full_name=customer.full_name or "Walk-in customer",
                    phone_e164=customer.phone or "+919876543210",
                ),
                address=AddressFinalization(
                    line1=address.line1,
                    locality=address.locality,
                    city=address.city,
                    postal_code=address.postal_code,
                    latitude=address.latitude,
                    longitude=address.longitude,
                    line2=address.line2,
                ),
                vehicle=VehicleContext(
                    make=vehicle.make,
                    model=vehicle.model,
                    year=vehicle.year,
                    fuel_type=vehicle.fuel_type,
                    transmission=vehicle.transmission,
                ),
                save_vehicle=False,
                save_address=False,
            ),
            user,
            request_id,
        )
        hold = SlotService(self.db).create_hold(job_id, body.slot_id, user, None)
        booked = BookingService(self.db).confirm(job_id, hold.hold.id, user, request_id)
        job = self.jobs.repo.get(job_id)
        assert job is not None
        audit_id = self.audit.record(
            admin,
            "ON_BEHALF_BOOK",
            "job_card",
            job.public_ref,
            reason=body.admin_note or "Booked on behalf of walk-in customer",
            after={"booking_id": booked.booking.id, "public_ref": job.public_ref},
            request_id=request_id,
        )
        return OnBehalfResponse(
            job_card_id=job.id,
            public_ref=job.public_ref,
            booking_id=booked.booking.id,
            audit_id=audit_id,
        )
