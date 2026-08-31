from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db.models import (
    CmsBlock,
    FeatureSetting,
    ServiceAreaRule,
    ServiceCategory,
    ServiceOffering,
)
from app.modules.catalog.schemas import (
    CatalogHomeResponse,
    GeneralServiceOffering,
    GeneralServiceSection,
    HeroBlock,
    HomeSections,
    MediaItem,
    Money,
    OneManJob,
    ServiceArea,
    ServiceDetailResponse,
    ServiceListItem,
    ServiceListResponse,
    ServiceRepairEntry,
    SosSection,
    SosTile,
    TrustItem,
    UncertainRepairSection,
)

DEFAULT_AREA_SLUG = "koramangala-bengaluru"
GS_SLUG = "general-service-health-report"


def _money(
    amount_minor: int | None, currency: str = "INR", *, with_from: bool = False
) -> Money | None:
    if amount_minor is None:
        return None
    rupees = amount_minor // 100
    label = f"From ₹{rupees:,}"
    return Money(
        amount_minor=amount_minor,
        currency=currency,
        label=label if with_from else None,
    )


def _cms_payload(db: Session, key: str, locale: str) -> dict:
    row = db.scalar(
        select(CmsBlock).where(
            CmsBlock.block_key == key,
            CmsBlock.locale == locale,
            CmsBlock.is_active.is_(True),
        )
    )
    return row.payload if row else {}


class CatalogQueryService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _default_area_slug(self) -> str:
        setting = self.db.get(FeatureSetting, "default_service_area_slug")
        if setting and isinstance(setting.value, dict):
            slug = setting.value.get("default_service_area_slug")
            if isinstance(slug, str) and slug:
                return slug
        if setting and isinstance(setting.value, str):
            return setting.value
        return DEFAULT_AREA_SLUG

    def home(self, service_area_slug: str | None, locale: str) -> CatalogHomeResponse:
        slug = service_area_slug or self._default_area_slug()
        area = self.db.scalar(
            select(ServiceAreaRule).where(
                ServiceAreaRule.slug == slug,
                ServiceAreaRule.is_active.is_(True),
            )
        )
        serviceable = area is not None
        area_name = area.name if area else "Koramangala, Bengaluru"

        gs = self.db.scalar(
            select(ServiceOffering)
            .options(selectinload(ServiceOffering.included_items))
            .where(ServiceOffering.slug == GS_SLUG, ServiceOffering.is_active.is_(True))
        )
        if gs is None:
            raise LookupError("general_service_missing")

        included = [
            item.label
            for item in sorted(gs.included_items, key=lambda row: row.sort_order)
            if item.is_active
        ]
        price = _money(gs.display_price_minor, gs.currency, with_from=True)
        assert price is not None

        hero_payload = _cms_payload(self.db, "home.hero", locale)
        trust_payload = _cms_payload(self.db, "home.trust_strip", locale)
        sos_payload = _cms_payload(self.db, "home.sos", locale)
        search_payload = _cms_payload(self.db, "home.search", locale)

        hero_blocks = [HeroBlock.model_validate(block) for block in hero_payload.get("blocks", [])]
        trust = [TrustItem.model_validate(item) for item in trust_payload.get("items", [])]
        sos = SosSection(
            headline=sos_payload.get("headline", "Emergency · not scheduled service"),
            tiles=[SosTile.model_validate(tile) for tile in sos_payload.get("tiles", [])],
        )

        one_man = self.db.scalars(
            select(ServiceOffering)
            .where(
                ServiceOffering.flow_policy == "ONE_MAN",
                ServiceOffering.is_active.is_(True),
            )
            .order_by(ServiceOffering.sort_order, ServiceOffering.name)
        ).all()

        return CatalogHomeResponse(
            service_area=ServiceArea(slug=slug, name=area_name, serviceable=serviceable),
            hero={"blocks": hero_blocks},
            sections=HomeSections(
                general_service=GeneralServiceSection(
                    offering=GeneralServiceOffering(
                        slug=gs.slug,
                        name=gs.name,
                        flow_policy=gs.flow_policy,
                        display_price=price,
                        duration_minutes=gs.duration_minutes,
                        included_items=included,
                        policy_note="Estimate before slot · no add-ons · no advisor call",
                    )
                ),
                service_repair_entry=ServiceRepairEntry(
                    offering_slug=GS_SLUG,
                    policy_note_warn="Add repairs → callback → accept on app before slot",
                    cta_label="Select repairs / replacements",
                ),
                one_man_jobs=[
                    OneManJob(
                        slug=job.slug,
                        name=job.name,
                        flow_policy=job.flow_policy,
                        display_price=_money(job.display_price_minor, job.currency)
                        or Money(amount_minor=0),
                        duration_minutes=job.duration_minutes,
                        icon_key=job.icon_key,
                    )
                    for job in one_man
                ],
                sos=sos,
                uncertain_repair=UncertainRepairSection(
                    title="Uncertain repair?",
                    subtitle="Book inspection first · quote after we see the car",
                    offering_slug="inspection-and-repair",
                    cta="Start inspection booking",
                ),
            ),
            trust_strip=trust,
            search_placeholder=search_payload.get(
                "placeholder", "Search make, model or plate (optional)"
            ),
        )

    def list_services(
        self,
        flow_policy: str | None,
        category_slug: str | None,
        page: int,
        page_size: int,
    ) -> ServiceListResponse:
        stmt = select(ServiceOffering).where(ServiceOffering.is_active.is_(True))
        if flow_policy:
            stmt = stmt.where(ServiceOffering.flow_policy == flow_policy)
        if category_slug:
            stmt = stmt.join(ServiceCategory).where(ServiceCategory.slug == category_slug)
        stmt = stmt.order_by(ServiceOffering.sort_order, ServiceOffering.name)
        rows = self.db.scalars(stmt).all()
        total = len(rows)
        start = (page - 1) * page_size
        page_rows = rows[start : start + page_size]
        return ServiceListResponse(
            items=[
                ServiceListItem(
                    slug=row.slug,
                    name=row.name,
                    flow_policy=row.flow_policy,
                    display_price=_money(row.display_price_minor, row.currency),
                    duration_minutes=row.duration_minutes,
                    short_description=row.short_description,
                )
                for row in page_rows
            ],
            page=page,
            page_size=page_size,
            total=total,
        )

    def get_by_slug(self, slug: str) -> ServiceDetailResponse | None:
        row = self.db.scalar(
            select(ServiceOffering)
            .options(selectinload(ServiceOffering.included_items))
            .where(ServiceOffering.slug == slug, ServiceOffering.is_active.is_(True))
        )
        if row is None:
            return None
        included = [
            item.label
            for item in sorted(row.included_items, key=lambda item: item.sort_order)
            if item.is_active
        ]
        disclosures = row.disclosures if isinstance(row.disclosures, list) else []
        media_raw = row.media if isinstance(row.media, list) else []
        media = [MediaItem.model_validate(item) for item in media_raw]
        return ServiceDetailResponse(
            slug=row.slug,
            name=row.name,
            flow_policy=row.flow_policy,
            display_price=_money(row.display_price_minor, row.currency),
            duration_minutes=row.duration_minutes,
            included_items=included,
            disclosures=[str(item) for item in disclosures],
            media=media,
            is_active=row.is_active,
            visit_count=2 if row.flow_policy == "INSPECTION_REPAIR" else 1,
            price_presentation=(
                "quote_after_inspection"
                if row.flow_policy == "INSPECTION_REPAIR"
                else "pre_booking"
            ),
            inspection_fee_display="From ₹499" if row.flow_policy == "INSPECTION_REPAIR" else None,
        )
