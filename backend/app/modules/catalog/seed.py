from __future__ import annotations

from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import (
    CmsBlock,
    FeatureSetting,
    IncludedServiceItem,
    PricingPolicy,
    RepairCategory,
    RepairOffering,
    ServiceAreaRule,
    ServiceCategory,
    ServiceOffering,
)

GS_SLUG = "general-service-health-report"
IR_SLUG = "inspection-and-repair"

ONE_MAN_JOBS = [
    ("bulb-headlight", "Bulb / headlight", 39900, 30, "bulb", 1),
    ("sensor-obd", "Sensor / OBD code", 44900, 45, "sensor", 2),
    ("wiper-blades", "Wiper blades", 34900, 20, "wiper", 3),
    ("battery-check", "Battery check", 29900, 30, "battery", 4),
    ("interior-light", "Interior light", 39900, 25, "interior", 5),
    ("panel-clip-fit", "Panel / clip fit", 44900, 40, "panel", 6),
]

REPAIR_CATEGORIES = [
    ("ac-cooling", "AC & cooling", 1),
    ("brakes", "Brakes", 2),
    ("body", "Body", 3),
    ("filters", "Filters", 4),
    ("lighting", "Lighting", 5),
]

REPAIR_ADDONS = [
    ("ac-gas-refill", "AC gas refill", 120000, 1, "ac-cooling", "part-ac"),
    ("brake-pads-pair", "Brake pads (pair)", 180000, 2, "brakes", "part-brake"),
    ("ac-condenser-oem", "AC condenser OEM", 420000, 3, "ac-cooling", "part-ac"),
    ("bumper-repaint", "Bumper repaint", 250000, 4, "body", "part-body"),
    ("cabin-filter", "Cabin filter", 65000, 5, "filters", "part-filter"),
    ("headlight-assembly", "Headlight assembly", 140000, 6, "lighting", "part-light"),
]


def _upsert_by_slug(db: Session, model, slug: str, **values):
    row = db.scalar(select(model).where(model.slug == slug))
    if row is None:
        row = model(id=str(uuid4()), slug=slug, **values)
        db.add(row)
    else:
        for key, value in values.items():
            setattr(row, key, value)
    return row


def seed_catalog(db: Session) -> None:
    area = db.scalar(select(ServiceAreaRule).where(ServiceAreaRule.slug == "koramangala-bengaluru"))
    if area is None:
        area = ServiceAreaRule(
            id=str(uuid4()),
            slug="koramangala-bengaluru",
            name="Koramangala, Bengaluru",
            city="Bengaluru",
            locality="Koramangala",
            postal_prefixes=["560034", "560035", "560047"],
            is_active=True,
            launch_phase="koramangala-mvp",
        )
        db.add(area)
    else:
        area.name = "Koramangala, Bengaluru"
        area.postal_prefixes = ["560034", "560035", "560047"]
        area.is_active = True

    general_cat = _upsert_by_slug(
        db, ServiceCategory, "general-service", name="General service", sort_order=1, is_active=True
    )
    oneman_cat = _upsert_by_slug(
        db, ServiceCategory, "one-man", name="One-man job", sort_order=2, is_active=True
    )
    ir_cat = _upsert_by_slug(
        db,
        ServiceCategory,
        "inspection-repair",
        name="Inspection + repair",
        sort_order=3,
        is_active=True,
    )
    db.flush()

    policy = _upsert_by_slug(
        db,
        PricingPolicy,
        "general-service-koramangala-2026",
        base_price_minor=299900,
        currency="INR",
        tax_rate_bps=1800,
        is_active=True,
        parts_advance_percent=60,
        inspection_fee_minor=49900,
    )
    ir_policy = _upsert_by_slug(
        db,
        PricingPolicy,
        "inspection-repair-koramangala-2026",
        base_price_minor=49900,
        currency="INR",
        tax_rate_bps=1800,
        is_active=True,
        parts_advance_percent=60,
        inspection_fee_minor=49900,
    )
    db.flush()

    gs = _upsert_by_slug(
        db,
        ServiceOffering,
        GS_SLUG,
        category_id=general_cat.id,
        pricing_policy_id=policy.id,
        name="General servicing + health report",
        short_description="Doorstep general service with health report",
        flow_policy="GENERAL_SERVICE",
        display_price_minor=299900,
        currency="INR",
        duration_minutes=120,
        sort_order=1,
        is_active=True,
        disclosures=["Price may vary by vehicle age and parts required."],
        media=[],
        dev_fixture=True,
    )
    db.flush()

    existing_included = {
        item.label
        for item in db.scalars(
            select(IncludedServiceItem).where(IncludedServiceItem.offering_id == gs.id)
        ).all()
    }
    for index, label in enumerate(
        ["Engine oil & filter", "Air filter check", "Fluid top-up", "30-point health report"],
        start=1,
    ):
        if label not in existing_included:
            db.add(
                IncludedServiceItem(
                    id=str(uuid4()),
                    offering_id=gs.id,
                    label=label,
                    sort_order=index,
                    is_active=True,
                )
            )

    for slug, name, price, duration, icon, order in ONE_MAN_JOBS:
        _upsert_by_slug(
            db,
            ServiceOffering,
            slug,
            category_id=oneman_cat.id,
            name=name,
            short_description=name,
            flow_policy="ONE_MAN",
            display_price_minor=price,
            currency="INR",
            duration_minutes=duration,
            sort_order=order,
            is_active=True,
            icon_key=icon,
            disclosures=[],
            media=[],
            dev_fixture=True,
        )

    _upsert_by_slug(
        db,
        ServiceOffering,
        IR_SLUG,
        category_id=ir_cat.id,
        pricing_policy_id=ir_policy.id,
        name="Inspection + repair",
        short_description="Inspection + repair · 2 visits",
        flow_policy="INSPECTION_REPAIR",
        display_price_minor=49900,
        currency="INR",
        duration_minutes=60,
        sort_order=1,
        is_active=True,
        disclosures=[
            "Quote after inspection · separate repair visit",
            "Inspection from ₹499 · repair price after inspection",
        ],
        media=[],
        dev_fixture=True,
    )

    categories: dict[str, RepairCategory] = {}
    for slug, name, order in REPAIR_CATEGORIES:
        categories[slug] = _upsert_by_slug(db, RepairCategory, slug, name=name, sort_order=order)
    db.flush()

    for slug, name, price, order, category_slug, icon_key in REPAIR_ADDONS:
        category = categories[category_slug]
        _upsert_by_slug(
            db,
            RepairOffering,
            slug,
            name=name,
            display_price_minor=price,
            currency="INR",
            is_active=True,
            sort_order=order,
            category_id=category.id,
            icon_key=icon_key,
            dev_fixture=True,
        )

    def upsert_cms(key: str, payload: dict) -> None:
        row = db.scalar(
            select(CmsBlock).where(CmsBlock.block_key == key, CmsBlock.locale == "en-IN")
        )
        if row is None:
            db.add(
                CmsBlock(
                    id=str(uuid4()), block_key=key, locale="en-IN", payload=payload, is_active=True
                )
            )
        else:
            row.payload = payload
            row.is_active = True

    upsert_cms(
        "home.hero",
        {
            "blocks": [
                {
                    "tab": "general",
                    "kicker": "General service · doorstep",
                    "title": "Full service + health report",
                    "media_url": None,
                    "media_type": "image",
                },
                {
                    "tab": "repair",
                    "kicker": "General + repair/replacement",
                    "title": "Same service. Pick what to fix.",
                    "media_url": None,
                    "media_type": "image",
                },
                {
                    "tab": "oneman",
                    "kicker": "One-man job",
                    "title": "Small fixes · fixed price",
                    "media_url": None,
                    "media_type": "image",
                },
            ]
        },
    )
    upsert_cms(
        "home.trust_strip",
        {
            "items": [
                {"icon_key": "van", "label": "Van at your door"},
                {"icon_key": "techs", "label": "Trained techs"},
                {"icon_key": "parts", "label": "Genuine parts"},
                {"icon_key": "warranty", "label": "Warranty"},
            ]
        },
    )
    upsert_cms(
        "home.sos",
        {
            "headline": "Emergency · not scheduled service",
            "tiles": [
                {"id": "call_ops", "label": "Call ops"},
                {"id": "flat_tyre", "label": "Flat tyre"},
                {"id": "dead_battery", "label": "Dead battery"},
                {"id": "tow", "label": "Tow"},
            ],
        },
    )
    upsert_cms("home.search", {"placeholder": "Search make, model or plate (optional)"})

    setting = db.get(FeatureSetting, "default_service_area_slug")
    value = {"default_service_area_slug": "koramangala-bengaluru"}
    if setting is None:
        db.add(FeatureSetting(key="default_service_area_slug", value=value))
    else:
        setting.value = value

    auto_publish = db.get(FeatureSetting, "auto_publish_inspection_estimate")
    flag = {"enabled": True}
    if auto_publish is None:
        db.add(FeatureSetting(key="auto_publish_inspection_estimate", value=flag))
    else:
        auto_publish.value = flag

    db.commit()
