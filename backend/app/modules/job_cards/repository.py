from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.modules.job_cards.models import JobCard, JobCardConcern, JobCardEvent, JobCardItem


class JobCardRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, job_card_id: str) -> JobCard | None:
        return self.db.scalar(
            select(JobCard)
            .where(JobCard.id == job_card_id)
            .options(
                selectinload(JobCard.items),
                selectinload(JobCard.concerns),
                selectinload(JobCard.events),
            )
        )

    def add_event(
        self,
        job_card_id: str,
        event_type: str,
        *,
        actor_profile_id: str | None,
        request_id: str | None,
        payload: dict | None = None,
    ) -> None:
        self.db.add(
            JobCardEvent(
                job_card_id=job_card_id,
                event_type=event_type,
                actor_profile_id=actor_profile_id,
                request_id=request_id,
                payload=payload,
            )
        )

    def replace_concerns(self, job_card: JobCard, texts: list[str]) -> None:
        for existing in list(job_card.concerns):
            self.db.delete(existing)
        self.db.flush()
        for index, text in enumerate(texts):
            self.db.add(JobCardConcern(job_card_id=job_card.id, text=text, sort_order=index))

    def add_service_item(
        self,
        job_card_id: str,
        offering_id: str,
        label: str,
        unit_price_minor: int,
    ) -> None:
        self.db.add(
            JobCardItem(
                job_card_id=job_card_id,
                kind="SERVICE",
                service_offering_id=offering_id,
                label_snapshot=label,
                unit_price_minor=unit_price_minor,
                currency="INR",
            )
        )

    def add_repair_item(
        self,
        job_card_id: str,
        offering_id: str,
        label: str,
        unit_price_minor: int,
        quantity: int = 1,
    ) -> JobCardItem:
        item = JobCardItem(
            job_card_id=job_card_id,
            kind="REPAIR",
            repair_offering_id=offering_id,
            quantity=quantity,
            label_snapshot=label,
            unit_price_minor=unit_price_minor,
            currency="INR",
        )
        self.db.add(item)
        self.db.flush()
        return item
