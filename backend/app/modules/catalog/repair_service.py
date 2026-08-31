from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db.models import RepairCategory, RepairOffering


class RepairOfferingService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_offerings(
        self,
        *,
        category_id: str | None = None,
        query: str | None = None,
        vehicle_make: str | None = None,
        vehicle_model: str | None = None,
        vehicle_year: int | None = None,
    ) -> list[dict]:
        stmt = (
            select(RepairOffering)
            .where(RepairOffering.is_active.is_(True))
            .options(selectinload(RepairOffering.category))
            .order_by(RepairOffering.sort_order.asc())
        )
        if category_id:
            stmt = stmt.where(RepairOffering.category_id == category_id)
        if query:
            stmt = stmt.where(RepairOffering.name.ilike(f"%{query.strip()}%"))
        rows = list(self.db.scalars(stmt).all())
        _ = (vehicle_make, vehicle_model, vehicle_year)
        items = []
        for row in rows:
            category = row.category
            items.append(
                {
                    "id": row.id,
                    "slug": row.slug,
                    "name": row.name,
                    "display_price": {
                        "amount_minor": row.display_price_minor,
                        "currency": row.currency,
                    },
                    "category": (
                        {"id": category.id, "name": category.name, "slug": category.slug}
                        if category is not None
                        else None
                    ),
                    "icon_key": row.icon_key,
                    "compatible": True,
                }
            )
        return items


def get_category(db: Session, slug: str) -> RepairCategory | None:
    return db.scalar(select(RepairCategory).where(RepairCategory.slug == slug))
