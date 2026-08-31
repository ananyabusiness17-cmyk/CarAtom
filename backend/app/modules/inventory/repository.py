from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.inventory.invariants import assert_location, assert_non_negative
from app.modules.inventory.models import LOCATIONS, InventoryMovement, InventorySku, InventoryStock


class InventoryRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_sku(self, sku_id: str) -> InventorySku | None:
        return self.db.get(InventorySku, sku_id)

    def get_sku_by_code(self, sku_code: str) -> InventorySku | None:
        return self.db.scalar(select(InventorySku).where(InventorySku.sku_code == sku_code))

    def list_skus(
        self,
        *,
        q: str | None = None,
        low_stock: bool | None = None,
        location: str | None = None,
        cursor: str | None = None,
        limit: int = 50,
    ) -> tuple[list[InventorySku], str | None]:
        query = select(InventorySku).order_by(InventorySku.sku_code)
        if q:
            like = f"%{q.lower()}%"
            query = query.where(
                func.lower(InventorySku.name).like(like)
                | func.lower(InventorySku.sku_code).like(like)
                | func.lower(func.coalesce(InventorySku.oem_code, "")).like(like)
            )
        if cursor:
            query = query.where(InventorySku.sku_code > cursor)
        rows = list(self.db.scalars(query.limit(limit + 1)).all())
        next_cursor = None
        if len(rows) > limit:
            next_cursor = rows[limit - 1].sku_code
            rows = rows[:limit]
        if low_stock is True:
            rows = [sku for sku in rows if self.is_low(sku)]
        if location:
            loc = assert_location(location)
            rows = [sku for sku in rows if self.qty(sku.id, loc) > 0]
        return rows, next_cursor

    def qty(self, sku_id: str, location: str) -> int:
        row = self.db.scalar(
            select(InventoryStock).where(
                InventoryStock.sku_id == sku_id, InventoryStock.location_code == location
            )
        )
        return row.quantity if row else 0

    def stock_map(self, sku_id: str) -> dict[str, int]:
        rows = self.db.scalars(select(InventoryStock).where(InventoryStock.sku_id == sku_id)).all()
        mapped = {code: 0 for code in LOCATIONS}
        for row in rows:
            mapped[row.location_code] = row.quantity
        return mapped

    def total(self, sku_id: str) -> int:
        return sum(self.stock_map(sku_id).values())

    def is_low(self, sku: InventorySku) -> bool:
        return self.total(sku.id) <= sku.low_stock_threshold

    def low_stock_count(self) -> int:
        skus = list(self.db.scalars(select(InventorySku).where(InventorySku.is_active.is_(True))))
        return sum(1 for sku in skus if self.is_low(sku))

    def apply_delta(self, sku_id: str, location: str, delta: int) -> InventoryStock:
        loc = assert_location(location)
        row = self.db.scalar(
            select(InventoryStock).where(
                InventoryStock.sku_id == sku_id, InventoryStock.location_code == loc
            )
        )
        if row is None:
            new_qty = delta
            assert_non_negative(new_qty)
            row = InventoryStock(
                id=str(uuid4()),
                sku_id=sku_id,
                location_code=loc,
                quantity=new_qty,
                updated_at=datetime.now(UTC),
            )
            self.db.add(row)
            self.db.flush()
            return row
        new_qty = row.quantity + delta
        assert_non_negative(new_qty)
        row.quantity = new_qty
        row.updated_at = datetime.now(UTC)
        return row

    def add_movement(self, **kwargs) -> InventoryMovement:
        row = InventoryMovement(id=str(uuid4()), **kwargs)
        self.db.add(row)
        self.db.flush()
        return row
