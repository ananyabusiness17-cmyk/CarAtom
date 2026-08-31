from uuid import NAMESPACE_URL, uuid5

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Profile
from app.modules.inventory.models import LOCATIONS, InventorySku, InventoryStock
from app.modules.inventory.repository import InventoryRepository

DEMO_SKUS = [
    ("CF-HON-01", "Cabin filter", {"WH": 14, "VAN_A": 3}, 5, None),
    ("R134A-250", "R134a gas 250g", {"WH": 4, "VAN_A": 1}, 6, None),
    ("COND-CITY", "City condenser OEM", {"WH": 1, "VAN_A": 0}, 2, None),
    ("PAG-250", "PAG oil 250ml", {"WH": 22, "VAN_A": 0}, 5, None),
]


def ensure_demo_admin(db: Session) -> Profile:
    actor = db.scalar(select(Profile).where(Profile.role == "admin"))
    if actor is not None:
        if not actor.full_name:
            actor.full_name = "Priya"
        return actor
    actor_id = str(uuid5(NAMESPACE_URL, "caratom.admin.priya"))
    existing = db.get(Profile, actor_id)
    if existing is not None:
        existing.role = "admin"
        existing.full_name = existing.full_name or "Priya"
        return existing
    row = Profile(
        id=actor_id,
        role="admin",
        is_active=True,
        full_name="Priya",
        phone="+919800000001",
    )
    db.add(row)
    db.flush()
    return row


def seed_inventory_demo(db: Session) -> None:
    ensure_demo_admin(db)
    repo = InventoryRepository(db)
    for code, name, stock, threshold, oem in DEMO_SKUS:
        sku = repo.get_sku_by_code(code)
        if sku is None:
            sku = InventorySku(
                sku_code=code,
                name=name,
                oem_code=oem,
                unit="each",
                low_stock_threshold=threshold,
            )
            db.add(sku)
            db.flush()
        sku.name = name
        sku.low_stock_threshold = threshold
        for loc in LOCATIONS:
            qty = stock.get(loc, 0)
            existing = db.scalar(
                select(InventoryStock).where(
                    InventoryStock.sku_id == sku.id, InventoryStock.location_code == loc
                )
            )
            if existing is None:
                if loc in stock:
                    db.add(InventoryStock(sku_id=sku.id, location_code=loc, quantity=qty))
            else:
                existing.quantity = qty
    from app.modules.catalog.kit_service import seed_catalog_kits
    from app.modules.catalog.seed import seed_catalog

    seed_catalog(db)
    seed_catalog_kits(db)
    db.commit()
