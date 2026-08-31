from pydantic import BaseModel


class Money(BaseModel):
    amount_minor: int
    currency: str = "INR"
    label: str | None = None


class HeroBlock(BaseModel):
    tab: str
    kicker: str
    title: str
    media_url: str | None = None
    media_type: str | None = None


class GeneralServiceOffering(BaseModel):
    slug: str
    name: str
    flow_policy: str
    display_price: Money
    duration_minutes: int | None = None
    included_items: list[str]
    policy_note: str


class ServiceRepairEntry(BaseModel):
    offering_slug: str
    policy_note_warn: str
    cta_label: str


class OneManJob(BaseModel):
    slug: str
    name: str
    flow_policy: str
    display_price: Money
    duration_minutes: int | None = None
    icon_key: str | None = None


class SosTile(BaseModel):
    id: str
    label: str


class SosSection(BaseModel):
    headline: str
    tiles: list[SosTile]


class GeneralServiceSection(BaseModel):
    offering: GeneralServiceOffering


class UncertainRepairSection(BaseModel):
    title: str
    subtitle: str
    offering_slug: str
    cta: str


class HomeSections(BaseModel):
    general_service: GeneralServiceSection
    service_repair_entry: ServiceRepairEntry
    one_man_jobs: list[OneManJob]
    sos: SosSection
    uncertain_repair: UncertainRepairSection | None = None


class ServiceArea(BaseModel):
    slug: str
    name: str
    serviceable: bool


class TrustItem(BaseModel):
    icon_key: str
    label: str


class CatalogHomeResponse(BaseModel):
    service_area: ServiceArea
    hero: dict[str, list[HeroBlock]]
    sections: HomeSections
    trust_strip: list[TrustItem]
    search_placeholder: str


class ServiceListItem(BaseModel):
    slug: str
    name: str
    flow_policy: str
    display_price: Money | None = None
    duration_minutes: int | None = None
    short_description: str | None = None


class ServiceListResponse(BaseModel):
    items: list[ServiceListItem]
    page: int
    page_size: int
    total: int


class MediaItem(BaseModel):
    url: str
    type: str


class ServiceDetailResponse(BaseModel):
    slug: str
    name: str
    flow_policy: str
    display_price: Money | None = None
    duration_minutes: int | None = None
    included_items: list[str]
    disclosures: list[str]
    media: list[MediaItem]
    is_active: bool
    visit_count: int | None = None
    price_presentation: str | None = None
    inspection_fee_display: str | None = None
