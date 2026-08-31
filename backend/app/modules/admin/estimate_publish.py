from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common.errors import DomainProblem
from app.core.deps import CurrentUser
from app.core.flow_decision import build_flow_decision
from app.db.models import RepairOffering
from app.modules.advisor.repository import AdvisorRepository
from app.modules.advisor.schemas import (
    AdminPublishEstimateRequest,
    AdminPublishEstimateResponse,
    PublishLineIn,
)
from app.modules.estimates.models import Estimate, EstimateRejection
from app.modules.estimates.repository import EstimateRepository
from app.modules.job_cards import state_machine
from app.modules.job_cards.schemas import MoneyOut
from app.modules.job_cards.service import JobCardService, to_flow_schema
from app.modules.pricing.service import content_hash

CANNED_REVISION_LINES: list[PublishLineIn] = [
    PublishLineIn(
        kind="SERVICE",
        label="General servicing + health report",
        amount_minor=299900,
    ),
    PublishLineIn(
        kind="REPAIR",
        repair_offering_slug="ac-gas-refill",
        label="AC gas refill",
        amount_minor=120000,
    ),
    PublishLineIn(
        kind="REPAIR",
        repair_offering_slug="brake-pads-pair",
        label="Brake pads (pair)",
        amount_minor=220000,
    ),
    PublishLineIn(
        kind="REPAIR",
        label="Brake fluid flush",
        amount_minor=45000,
    ),
]


class EstimatePublishService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.job_cards = JobCardService(db)
        self.estimates = EstimateRepository(db)
        self.advisor = AdvisorRepository(db)

    def publish(
        self,
        job_card_id: str,
        body: AdminPublishEstimateRequest,
        admin: CurrentUser,
        request_id: str | None,
    ) -> AdminPublishEstimateResponse:
        if admin.role != "admin":
            raise DomainProblem(403, "FORBIDDEN", "Insufficient role.")
        job_card = self.job_cards.get_accessible(job_card_id, admin)
        case = self.advisor.get_by_job_card_id(job_card.id)
        desk_mode = body.advisor_case_id is None
        if not desk_mode:
            if case is None or case.id != body.advisor_case_id:
                raise DomainProblem(
                    409, "ADVISOR_CASE_NOT_OPEN", "Advisor case is not open for publish."
                )
            if case.status in {"CONFIRMED", "CANCELLED"}:
                raise DomainProblem(
                    409, "ADVISOR_CASE_NOT_OPEN", "Advisor case is not open for publish."
                )
        if body.force_approve:
            from app.modules.audit.service import require_reason

            require_reason(body.reason)
        previous = self.estimates.latest_for_job(job_card.id)
        prev_by_slug: dict[str, int] = {}
        prev_service = None
        if previous is not None:
            for line in previous.line_items:
                if line.repair_offering_slug:
                    prev_by_slug[line.repair_offering_slug] = line.amount_minor
                elif line.kind == "SERVICE":
                    prev_service = line.amount_minor
                elif line.kind == "REPAIR" and line.label:
                    prev_by_slug[line.label] = line.amount_minor

        self.estimates.supersede_ready(job_card.id)
        if previous is not None and previous.status == "ACCEPTED":
            previous.status = "SUPERSEDED"

        payload_lines = []
        total = 0
        resolved: list[tuple[PublishLineIn, str, str | None, int | None, str | None]] = []
        for line in body.lines:
            offering = None
            label = line.label
            slug = line.repair_offering_slug
            if slug:
                offering = self.db.scalar(select(RepairOffering).where(RepairOffering.slug == slug))
                if offering is None:
                    raise DomainProblem(
                        422, "REPAIR_NOT_COMPATIBLE", f"Unknown repair offering {slug}."
                    )
                label = offering.name
            if not label:
                raise DomainProblem(422, "INVALID_OFFERING_FOR_FLOW", "Line label is required.")
            was = None
            change = None
            if slug and slug in prev_by_slug:
                if prev_by_slug[slug] != line.amount_minor:
                    was = prev_by_slug[slug]
                    change = "PRICE_CHANGED"
            elif (
                line.kind == "SERVICE"
                and prev_service is not None
                and prev_service != line.amount_minor
            ):
                was = prev_service
                change = "PRICE_CHANGED"
            elif slug and slug not in prev_by_slug:
                change = "ADDED"
            elif line.kind == "REPAIR" and not slug:
                change = "ADDED"
            payload_lines.append(
                {
                    "label": label,
                    "kind": line.kind,
                    "amount_minor": line.amount_minor,
                    "is_included": False,
                    "repair_offering_slug": slug,
                    "was_amount_minor": was,
                    "change_type": change,
                }
            )
            total += line.amount_minor
            resolved.append((line, label, slug, was, change))

        estimate = Estimate(
            id=str(uuid4()),
            job_card_id=job_card.id,
            version=self.estimates.next_version(job_card.id),
            status="READY",
            total_minor=total,
            currency="INR",
            expires_at=None,
            content_hash=content_hash(payload_lines),
        )
        self.db.add(estimate)
        self.db.flush()
        for index, (line, label, slug, was, change) in enumerate(resolved):
            self.estimates.add_line(
                estimate.id,
                sort_order=index,
                label=label,
                kind=line.kind,
                amount_minor=line.amount_minor,
                is_included=False,
                was_amount_minor=was,
                change_type=change,
                repair_offering_slug=slug,
            )

        self._sync_repair_items(job_card.id, body.lines)

        if case is not None and not desk_mode:
            if case.status in {"OPEN", "CONTACTING", "CUSTOMER_REACHED"}:
                if case.status == "OPEN":
                    self.advisor.transition(case, "CONTACTING", admin.id)
                if case.status == "CONTACTING":
                    self.advisor.transition(case, "CHANGES_PROPOSED", admin.id)
                elif case.status == "CUSTOMER_REACHED":
                    self.advisor.transition(case, "CHANGES_PROPOSED", admin.id)
            if case.status == "CHANGES_PROPOSED":
                self.advisor.transition(case, "CUSTOMER_CONFIRMATION_DUE", admin.id)
            elif case.status != "CUSTOMER_CONFIRMATION_DUE":
                try:
                    self.advisor.transition(case, "CUSTOMER_CONFIRMATION_DUE", admin.id)
                except DomainProblem:
                    if case.status != "CUSTOMER_CONFIRMATION_DUE":
                        raise
            case.pending_estimate_id = estimate.id
            case.assigned_admin_id = admin.id
            case.updated_at = datetime.now(UTC)

        if job_card.status in {"ADVISOR_REQUIRED", "ADVISOR_IN_PROGRESS"}:
            state_machine.transition(job_card, "REVISED_ESTIMATE_PENDING")
        if body.force_approve and estimate.status == "READY":
            from app.modules.job_cards.one_man_policy import auto_accept_estimate

            auto_accept_estimate(self.db, job_card, estimate)
        job_card.updated_at = datetime.now(UTC)
        self.job_cards.repo.add_event(
            job_card.id,
            "ADMIN_ESTIMATE_PUBLISHED",
            actor_profile_id=admin.id,
            request_id=request_id,
            payload={
                "estimate_id": estimate.id,
                "version": estimate.version,
                "notes": body.revision_notes_customer_safe,
            },
        )
        from app.modules.notifications.models import OutboxEvent
        from app.modules.notifications.service import enqueue_intent

        self.db.add(
            OutboxEvent(
                event_type="ESTIMATE_PUBLISHED",
                payload={
                    "job_card_id": job_card.id,
                    "estimate_id": estimate.id,
                    "version": estimate.version,
                },
            )
        )
        if job_card.profile_id:
            intent = "advisor_revised" if previous is not None else "estimate_ready"
            enqueue_intent(
                self.db,
                profile_id=job_card.profile_id,
                intent=intent,
                entity_type="estimate",
                entity_id=estimate.id,
                context={
                    "service_name": "your vehicle",
                    "estimate_id": estimate.id,
                    "job_card_id": job_card.id,
                },
                request_id=request_id,
            )
        if desk_mode:
            from app.modules.audit.service import AuditService

            AuditService(self.db).record(
                admin,
                "jobs.estimate_publish",
                "job_card",
                job_card.public_ref,
                reason=body.reason,
                after={"estimate_id": estimate.id, "version": estimate.version},
                request_id=request_id,
            )
        notified = datetime.now(UTC)
        self.db.commit()
        loaded_estimate = self.estimates.get(estimate.id)
        loaded_job = self.job_cards.repo.get(job_card.id)
        assert loaded_estimate is not None and loaded_job is not None
        case = self.advisor.get_by_job_card_id(job_card.id)
        decision = build_flow_decision(loaded_job, loaded_estimate, advisor_case=case)
        return AdminPublishEstimateResponse(
            estimate=self.job_cards.to_estimate_out(loaded_estimate),
            advisor_case_id=case.id if case else "",
            advisor_case_status=case.status if case else "DESK",
            customer_notified_at=notified,
            flow_decision=to_flow_schema(decision),
            total=MoneyOut(amount_minor=loaded_estimate.total_minor, currency="INR"),
        )

    def _sync_repair_items(self, job_card_id: str, lines: list[PublishLineIn]) -> None:
        job = self.job_cards.repo.get(job_card_id)
        if job is None:
            return
        existing_repairs = [item for item in job.items if item.kind == "REPAIR"]
        keep_slugs: set[str] = set()
        for line in lines:
            if line.kind != "REPAIR" or not line.repair_offering_slug:
                continue
            keep_slugs.add(line.repair_offering_slug)
            offering = self.db.scalar(
                select(RepairOffering).where(RepairOffering.slug == line.repair_offering_slug)
            )
            if offering is None:
                continue
            match = next(
                (item for item in existing_repairs if item.repair_offering_id == offering.id),
                None,
            )
            if match is None:
                self.job_cards.repo.add_repair_item(
                    job_card_id, offering.id, offering.name, line.amount_minor
                )
            else:
                match.unit_price_minor = line.amount_minor
                match.label_snapshot = offering.name
        for item in existing_repairs:
            offering = (
                self.db.get(RepairOffering, item.repair_offering_id)
                if item.repair_offering_id
                else None
            )
            if offering is None or offering.slug not in keep_slugs:
                self.db.delete(item)

    def reject(
        self,
        job_card_id: str,
        estimate_id: str,
        user: CurrentUser,
        reason: str | None,
        request_id: str | None,
    ):
        job_card = self.job_cards.get_accessible(job_card_id, user)
        estimate = self.estimates.get(estimate_id)
        if estimate is None or estimate.job_card_id != job_card.id:
            raise DomainProblem(404, "NOT_FOUND", "Not found.")
        if estimate.status not in {"READY", "ACCEPTED"}:
            raise DomainProblem(
                409, "ESTIMATE_VERSION_MISMATCH", "This estimate cannot be declined."
            )
        estimate.status = "REJECTED"
        self.db.add(
            EstimateRejection(
                estimate_id=estimate.id,
                job_card_id=job_card.id,
                reason=reason,
                profile_id=user.id,
            )
        )
        case = self.advisor.get_by_job_card_id(job_card.id)
        if case is not None and case.status == "CUSTOMER_CONFIRMATION_DUE":
            self.advisor.transition(case, "DECLINED")
            case.customer_response = "DECLINED"
            case.pending_estimate_id = None
        if job_card.status == "REVISED_ESTIMATE_PENDING":
            state_machine.transition(job_card, "EDITABLE")
        elif job_card.status in {"ADVISOR_IN_PROGRESS", "ADVISOR_REQUIRED"}:
            state_machine.transition(job_card, "EDITABLE")
        elif (
            job_card.flow_policy == "INSPECTION_REPAIR" and job_card.status == "REPAIR_APPROVAL_DUE"
        ):
            state_machine.transition(job_card, "EDITABLE")
        job_card.updated_at = datetime.now(UTC)
        self.job_cards.repo.add_event(
            job_card.id,
            "ESTIMATE_REJECTED",
            actor_profile_id=user.id,
            request_id=request_id,
            payload={"estimate_id": estimate.id},
        )
        self.db.commit()
        loaded = self.job_cards.repo.get(job_card.id)
        assert loaded is not None
        case = self.advisor.get_by_job_card_id(loaded.id)
        from app.modules.advisor.schemas import RejectEstimateResponse

        return RejectEstimateResponse(
            job_card=self.job_cards.to_job_card_out(loaded),
            flow_decision=to_flow_schema(build_flow_decision(loaded, None, advisor_case=case)),
        )
