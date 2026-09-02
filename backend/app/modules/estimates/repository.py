from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.modules.estimates.models import Estimate, EstimateAcceptance, EstimateLineItem


class EstimateRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, estimate_id: str) -> Estimate | None:
        return self.db.scalar(
            select(Estimate)
            .where(Estimate.id == estimate_id)
            .options(selectinload(Estimate.line_items))
        )

    def latest_for_job(self, job_card_id: str) -> Estimate | None:
        return self.db.scalar(
            select(Estimate)
            .where(Estimate.job_card_id == job_card_id)
            .options(selectinload(Estimate.line_items))
            .order_by(Estimate.version.desc())
        )

    def ready_for_job(self, job_card_id: str) -> Estimate | None:
        return self.db.scalar(
            select(Estimate)
            .where(Estimate.job_card_id == job_card_id, Estimate.status == "READY")
            .options(selectinload(Estimate.line_items))
        )

    def next_version(self, job_card_id: str) -> int:
        latest = self.latest_for_job(job_card_id)
        return 1 if latest is None else latest.version + 1

    def supersede_ready(self, job_card_id: str) -> None:
        ready = self.ready_for_job(job_card_id)
        if ready is not None:
            ready.status = "SUPERSEDED"

    def add_line(
        self,
        estimate_id: str,
        *,
        sort_order: int,
        label: str,
        kind: str,
        amount_minor: int,
        is_included: bool,
        was_amount_minor: int | None = None,
        change_type: str | None = None,
        repair_offering_slug: str | None = None,
    ) -> None:
        self.db.add(
            EstimateLineItem(
                estimate_id=estimate_id,
                sort_order=sort_order,
                label=label,
                kind=kind,
                amount_minor=amount_minor,
                is_included=is_included,
                was_amount_minor=was_amount_minor,
                change_type=change_type,
                repair_offering_slug=repair_offering_slug,
            )
        )

    def add_acceptance(
        self,
        estimate_id: str,
        job_card_id: str,
        profile_id: str | None,
        accepted_total_minor: int,
        idempotency_key: str,
    ) -> EstimateAcceptance:
        existing = self.db.scalar(
            select(EstimateAcceptance).where(EstimateAcceptance.idempotency_key == idempotency_key)
        )
        if existing is not None:
            return existing
        row = EstimateAcceptance(
            estimate_id=estimate_id,
            job_card_id=job_card_id,
            profile_id=profile_id,
            accepted_total_minor=accepted_total_minor,
            idempotency_key=idempotency_key,
        )
        self.db.add(row)
        self.db.flush()
        return row
