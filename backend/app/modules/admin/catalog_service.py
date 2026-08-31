from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common.errors import DomainProblem
from app.core.deps import CurrentUser
from app.db.models import FeatureSetting, PricingPolicy, RepairOffering, ServiceOffering
from app.modules.admin.schemas import (
    CatalogOfferingRow,
    CatalogOverviewResponse,
    PatchOfferingRequest,
    PatchOfferingResponse,
    PatchSettingsRequest,
)
from app.modules.audit.service import AuditService
from app.modules.inventory.models import ServiceOfferingVersion


def _format_inr(amount_minor: int | None) -> str:
    if amount_minor is None:
        return "Quote"
    rupees = amount_minor / 100
    return f"₹{rupees:,.0f}"


class CatalogAdminService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.audit = AuditService(db)

    def _settings(self) -> dict:
        row = self.db.get(FeatureSetting, "ops_catalog")
        if row is None:
            return {
                "parts_advance_percent": 50,
                "second_vehicle_discount_percent": 10,
                "service_hours": {},
                "service_radius_km": 8,
            }
        return dict(row.value)

    def overview(self) -> CatalogOverviewResponse:
        offerings = list(
            self.db.scalars(select(ServiceOffering).order_by(ServiceOffering.sort_order)).all()
        )
        settings = self._settings()
        policy = self.db.scalar(select(PricingPolicy).where(PricingPolicy.is_active.is_(True)))
        parts = settings.get("parts_advance_percent")
        if parts is None and policy is not None:
            parts = policy.parts_advance_percent
        rows: list[CatalogOfferingRow] = []
        for off in offerings:
            if off.flow_policy == "INSPECTION_REPAIR":
                label = "Quote"
            else:
                label = _format_inr(off.display_price_minor)
            rows.append(
                CatalogOfferingRow(
                    slug=off.slug,
                    name=off.name,
                    display_price_minor=off.display_price_minor,
                    display_label=label,
                    kind="offering",
                    is_active=off.is_active,
                    version=getattr(off, "version", 1) or 1,
                    duration_minutes=off.duration_minutes,
                    flow_policy=off.flow_policy,
                    id=off.id,
                )
            )
        rows.append(
            CatalogOfferingRow(
                slug="second-vehicle-discount",
                name="2nd car discount",
                display_price_minor=None,
                display_label=f"{settings.get('second_vehicle_discount_percent', 10)}%",
                kind="policy",
                is_active=True,
            )
        )
        rows.append(
            CatalogOfferingRow(
                slug="parts-advance",
                name="Parts advance",
                display_price_minor=None,
                display_label=f"{parts or 50}%",
                kind="policy",
                is_active=True,
            )
        )
        return CatalogOverviewResponse(
            offerings=rows,
            parts_advance_percent=int(parts or 50),
            second_vehicle_discount_percent=int(
                settings.get("second_vehicle_discount_percent", 10)
            ),
            service_hours=settings.get("service_hours"),
            service_radius_km=settings.get("service_radius_km", 8),
        )

    def patch_offering(
        self, slug: str, body: PatchOfferingRequest, actor: CurrentUser, request_id: str | None
    ) -> PatchOfferingResponse:
        offering = self.db.scalar(select(ServiceOffering).where(ServiceOffering.slug == slug))
        if offering is None:
            raise DomainProblem(404, "NOT_FOUND", "Offering not found.")
        current_version = getattr(offering, "version", 1) or 1
        if body.expected_version is not None and body.expected_version != current_version:
            raise DomainProblem(
                409,
                "VERSION_MISMATCH",
                "Catalog version changed. Refresh and retry.",
            )
        before = {
            "display_price_minor": offering.display_price_minor,
            "is_active": offering.is_active,
        }
        if body.display_price_minor is not None:
            offering.display_price_minor = body.display_price_minor
            if offering.pricing_policy_id:
                policy = self.db.get(PricingPolicy, offering.pricing_policy_id)
                if policy is not None:
                    policy.base_price_minor = body.display_price_minor
        if body.is_active is not None:
            offering.is_active = body.is_active
        if body.name is not None:
            offering.name = body.name
        if body.duration_minutes is not None:
            offering.duration_minutes = body.duration_minutes
        if body.sort_order is not None:
            offering.sort_order = body.sort_order
        offering.version = current_version + 1
        offering.updated_at = datetime.now(UTC)
        self.db.add(
            ServiceOfferingVersion(
                offering_id=offering.id,
                version=offering.version,
                slug=offering.slug,
                name=offering.name,
                display_price_minor=offering.display_price_minor,
                is_active=offering.is_active,
                snapshot=before,
                actor_id=actor.id,
            )
        )
        audit_id = self.audit.record(
            actor,
            "catalog.patch_offering",
            "service_offering",
            offering.slug,
            before=before,
            after={
                "display_price_minor": offering.display_price_minor,
                "version": offering.version,
            },
            request_id=request_id,
        )
        return PatchOfferingResponse(
            slug=offering.slug,
            display_price_minor=offering.display_price_minor,
            version=offering.version,
            effective_at=datetime.now(UTC),
            audit_id=audit_id,
        )

    def patch_repair(
        self, slug: str, body: PatchOfferingRequest, actor: CurrentUser, request_id: str | None
    ) -> PatchOfferingResponse:
        offering = self.db.scalar(select(RepairOffering).where(RepairOffering.slug == slug))
        if offering is None:
            raise DomainProblem(404, "NOT_FOUND", "Repair offering not found.")
        before = {"display_price_minor": offering.display_price_minor}
        if body.display_price_minor is not None:
            offering.display_price_minor = body.display_price_minor
        if body.is_active is not None:
            offering.is_active = body.is_active
        if body.name is not None:
            offering.name = body.name
        offering.updated_at = datetime.now(UTC)
        audit_id = self.audit.record(
            actor,
            "catalog.patch_repair_offering",
            "repair_offering",
            offering.slug,
            before=before,
            after={"display_price_minor": offering.display_price_minor},
            request_id=request_id,
        )
        return PatchOfferingResponse(
            slug=offering.slug,
            display_price_minor=offering.display_price_minor,
            version=1,
            effective_at=datetime.now(UTC),
            audit_id=audit_id,
        )

    def patch_settings(
        self, body: PatchSettingsRequest, actor: CurrentUser, request_id: str | None
    ) -> CatalogOverviewResponse:
        current = self._settings()
        before = dict(current)
        if body.parts_advance_percent is not None:
            current["parts_advance_percent"] = body.parts_advance_percent
            policies = list(self.db.scalars(select(PricingPolicy)).all())
            for policy in policies:
                policy.parts_advance_percent = body.parts_advance_percent
        if body.second_vehicle_discount_percent is not None:
            current["second_vehicle_discount_percent"] = body.second_vehicle_discount_percent
        if body.service_hours is not None:
            current["service_hours"] = body.service_hours
        if body.service_radius_km is not None:
            current["service_radius_km"] = body.service_radius_km
        row = self.db.get(FeatureSetting, "ops_catalog")
        if row is None:
            self.db.add(FeatureSetting(key="ops_catalog", value=current))
        else:
            row.value = current
            row.updated_at = datetime.now(UTC)
        self.audit.record(
            actor,
            "catalog.patch_settings",
            "feature_settings",
            "ops_catalog",
            before=before,
            after=current,
            request_id=request_id,
        )
        return self.overview()
