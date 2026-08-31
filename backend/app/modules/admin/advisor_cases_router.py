from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser
from app.db.models import Profile
from app.modules.advisor.repository import AdvisorRepository
from app.modules.advisor.schemas import AdminJobCardOut, InboxResponse, InboxRowOut
from app.modules.advisor.service import AdvisorService, submitted_total
from app.modules.estimates.repository import EstimateRepository
from app.modules.job_cards.service import JobCardService, to_flow_schema


def mask_phone(phone: str | None) -> str | None:
    if not phone:
        return None
    digits = "".join(ch for ch in phone if ch.isdigit())
    if len(digits) < 4:
        return phone
    last = digits[-2:]
    prefix = digits[:-4]
    return f"+{prefix} ***{last}" if phone.startswith("+") else f"{prefix} ***{last}"


class AdminAdvisorService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = AdvisorRepository(db)
        self.advisor = AdvisorService(db)
        self.job_cards = JobCardService(db)
        self.estimates = EstimateRepository(db)

    def inbox(self) -> InboxResponse:
        rows = []
        for case in self.repo.list_open_cases():
            job = self.job_cards.repo.get(case.job_card_id)
            if job is None:
                continue
            profile = self.db.get(Profile, job.profile_id) if job.profile_id else None
            ctx = job.vehicle_context or {}
            latest = self.estimates.latest_for_job(job.id)
            rows.append(
                InboxRowOut(
                    job_card_id=job.id,
                    public_ref=job.public_ref,
                    status=case.status,
                    customer_name=profile.full_name if profile else None,
                    masked_phone=mask_phone(profile.phone if profile else case.verified_phone_e164),
                    submitted_total_minor=latest.total_minor if latest else submitted_total(job),
                    callback_requested_at=case.created_at,
                    vehicle_summary=(
                        f"{ctx.get('make', '')} {ctx.get('model', '')} "
                        f"{ctx.get('year', '')}".strip()
                    ),
                )
            )
        rows.sort(key=lambda row: row.callback_requested_at or datetime.min.replace(tzinfo=UTC))
        return InboxResponse(items=rows)

    def get_job(self, job_card_id: str, admin: CurrentUser) -> AdminJobCardOut:
        job_card = self.job_cards.get_accessible(job_card_id, admin)
        case = self.advisor.start_contact(job_card_id, admin)
        profile = self.db.get(Profile, job_card.profile_id) if job_card.profile_id else None
        estimate = self.estimates.latest_for_job(job_card.id)
        loaded = self.job_cards.repo.get(job_card.id)
        assert loaded is not None
        from app.modules.admin.closeout_service import billed_percent, money_rollup
        from app.modules.bookings.models import Booking
        from app.modules.invoices.models import Invoice

        labour, parts = money_rollup(estimate)
        booking = self.db.scalar(
            select(Booking)
            .where(Booking.job_card_id == job_card.id)
            .order_by(Booking.created_at.desc())
        )
        invoice = None
        if booking is not None:
            invoice = self.db.scalar(select(Invoice).where(Invoice.booking_id == booking.id))
        return AdminJobCardOut(
            job_card=self.job_cards.to_job_card_out(loaded),
            customer_name=profile.full_name if profile else None,
            phone_e164=profile.phone if profile else case.verified_phone_e164,
            advisor_case_id=case.id,
            advisor_case_status=case.status,
            submitted_estimate=self.job_cards.to_estimate_out(estimate) if estimate else None,
            flow_decision=to_flow_schema(self.job_cards._decision(loaded, estimate)),
            labour_total_minor=labour,
            parts_total_minor=parts,
            billed_percent=billed_percent(invoice),
        )
