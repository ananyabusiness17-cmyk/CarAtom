from __future__ import annotations

from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import RepairOffering, ServiceOffering
from app.modules.catalog.kit_models import CatalogKitLine
from app.modules.catalog.seed import GS_SLUG
from app.modules.inventory.models import InventorySku, InventoryStock
from app.modules.job_cards.models import JobCard
from app.modules.technicians.models import Technician
from app.modules.visits.models import TechnicianAssignment, Visit


class KitLineOut(BaseModel):
    sku_id: str | None = None
    sku_code: str | None = None
    label: str
    quantity: int
    line_kind: str
    van_qty: int | None = None
    wh_qty: int | None = None
    availability: str


class VisitKitOut(BaseModel):
    visit_id: str | None = None
    job_card_id: str
    van_code: str | None = None
    lines: list[KitLineOut] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class CatalogKitLineIn(BaseModel):
    sku_id: str | None = None
    quantity: int = Field(1, ge=1, le=99)
    line_kind: str = "PART"
    label: str | None = None


class CatalogKitPut(BaseModel):
    owner_type: str
    owner_id: str
    lines: list[CatalogKitLineIn]


class CatalogKitLineOut(BaseModel):
    id: str
    sku_id: str | None = None
    sku_code: str | None = None
    sku_name: str | None = None
    quantity: int
    line_kind: str
    label: str | None = None


class CatalogKitOut(BaseModel):
    owner_type: str
    owner_id: str
    owner_slug: str | None = None
    lines: list[CatalogKitLineOut]


KIT_SKU_MAP = {
    "cabin-filter": "CF-HON-01",
    "ac-gas-refill": "R134A-250",
    "ac-condenser-oem": "COND-CITY",
}


def _qty(db: Session, sku_id: str, location: str) -> int:
    row = db.scalar(
        select(InventoryStock).where(
            InventoryStock.sku_id == sku_id, InventoryStock.location_code == location
        )
    )
    return int(row.quantity) if row is not None else 0


def _owner_ids_for_job(db: Session, job: JobCard) -> list[tuple[str, str]]:
    owners: list[tuple[str, str]] = [("SERVICE_OFFERING", job.service_offering_id)]
    for item in job.items or []:
        if item.repair_offering_id:
            owners.append(("REPAIR_OFFERING", item.repair_offering_id))
    return owners


class KitService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def kit_for_job(
        self, job: JobCard, *, van_code: str | None, visit_id: str | None
    ) -> VisitKitOut:
        van = (van_code or "VAN_A").upper()
        if van not in {"VAN_A", "VAN_B", "VAN_C"}:
            van = "VAN_A"
        lines: list[KitLineOut] = []
        warnings: list[str] = []
        seen: set[str] = set()
        for owner_type, owner_id in _owner_ids_for_job(self.db, job):
            kit_rows = list(
                self.db.scalars(
                    select(CatalogKitLine)
                    .where(
                        CatalogKitLine.owner_type == owner_type,
                        CatalogKitLine.owner_id == owner_id,
                    )
                    .order_by(CatalogKitLine.sort_order.asc())
                ).all()
            )
            for row in kit_rows:
                key = row.sku_id or f"labour:{row.id}"
                if key in seen:
                    continue
                seen.add(key)
                sku = self.db.get(InventorySku, row.sku_id) if row.sku_id else None
                if row.line_kind == "LABOUR" or sku is None:
                    lines.append(
                        KitLineOut(
                            sku_id=None,
                            sku_code=None,
                            label=row.label or "Labour",
                            quantity=row.quantity,
                            line_kind="LABOUR",
                            availability="LABOUR",
                        )
                    )
                    continue
                van_qty = _qty(self.db, sku.id, van)
                wh_qty = _qty(self.db, sku.id, "WH")
                if van_qty >= row.quantity:
                    state = "ON_VAN"
                elif wh_qty >= row.quantity:
                    state = "IN_WH"
                    warnings.append(
                        f"{sku.name} is in warehouse — transfer to {van} before the run."
                    )
                else:
                    state = "SHORT"
                    warnings.append(f"{sku.name} is short on {van} and warehouse.")
                lines.append(
                    KitLineOut(
                        sku_id=sku.id,
                        sku_code=sku.sku_code,
                        label=row.label or sku.name,
                        quantity=row.quantity,
                        line_kind="PART",
                        van_qty=van_qty,
                        wh_qty=wh_qty,
                        availability=state,
                    )
                )
        return VisitKitOut(
            visit_id=visit_id,
            job_card_id=job.id,
            van_code=van_code,
            lines=lines,
            warnings=warnings,
        )

    def kit_for_visit(self, visit: Visit) -> VisitKitOut:
        job = self.db.get(JobCard, visit.job_card_id)
        if job is None:
            return VisitKitOut(visit_id=visit.id, job_card_id=visit.job_card_id)
        assignment = self.db.scalar(
            select(TechnicianAssignment).where(
                TechnicianAssignment.visit_id == visit.id,
                TechnicianAssignment.is_current.is_(True),
            )
        )
        van = None
        if assignment is not None:
            tech = self.db.get(Technician, assignment.technician_id)
            van = tech.van_code if tech else None
        return self.kit_for_job(job, van_code=van, visit_id=visit.id)

    def get_catalog_kit(self, owner_type: str, owner_id: str) -> CatalogKitOut:
        slug = None
        if owner_type == "SERVICE_OFFERING":
            off = self.db.get(ServiceOffering, owner_id)
            slug = off.slug if off else None
        elif owner_type == "REPAIR_OFFERING":
            off = self.db.get(RepairOffering, owner_id)
            slug = off.slug if off else None
        rows = list(
            self.db.scalars(
                select(CatalogKitLine)
                .where(
                    CatalogKitLine.owner_type == owner_type,
                    CatalogKitLine.owner_id == owner_id,
                )
                .order_by(CatalogKitLine.sort_order.asc())
            ).all()
        )
        lines: list[CatalogKitLineOut] = []
        for row in rows:
            sku = self.db.get(InventorySku, row.sku_id) if row.sku_id else None
            lines.append(
                CatalogKitLineOut(
                    id=row.id,
                    sku_id=row.sku_id,
                    sku_code=sku.sku_code if sku else None,
                    sku_name=sku.name if sku else None,
                    quantity=row.quantity,
                    line_kind=row.line_kind,
                    label=row.label,
                )
            )
        return CatalogKitOut(owner_type=owner_type, owner_id=owner_id, owner_slug=slug, lines=lines)

    def replace_catalog_kit(self, body: CatalogKitPut) -> CatalogKitOut:
        if body.owner_type not in {"SERVICE_OFFERING", "REPAIR_OFFERING"}:
            from app.common.errors import DomainProblem

            raise DomainProblem(422, "INVALID_OWNER_TYPE", "Unknown kit owner type.")
        existing = list(
            self.db.scalars(
                select(CatalogKitLine).where(
                    CatalogKitLine.owner_type == body.owner_type,
                    CatalogKitLine.owner_id == body.owner_id,
                )
            ).all()
        )
        for row in existing:
            self.db.delete(row)
        self.db.flush()
        for index, line in enumerate(body.lines):
            kind = line.line_kind if line.line_kind in {"LABOUR", "PART"} else "PART"
            sku_id = line.sku_id if kind == "PART" else None
            self.db.add(
                CatalogKitLine(
                    owner_type=body.owner_type,
                    owner_id=body.owner_id,
                    sku_id=sku_id,
                    quantity=line.quantity,
                    line_kind=kind,
                    label=line.label,
                    sort_order=index,
                )
            )
        self.db.flush()
        return self.get_catalog_kit(body.owner_type, body.owner_id)

    def used_by_sku(self, sku_id: str) -> list[dict[str, str]]:
        rows = list(
            self.db.scalars(select(CatalogKitLine).where(CatalogKitLine.sku_id == sku_id)).all()
        )
        out: list[dict[str, str]] = []
        for row in rows:
            name = ""
            slug = ""
            if row.owner_type == "SERVICE_OFFERING":
                off = self.db.get(ServiceOffering, row.owner_id)
                name = off.name if off else ""
                slug = off.slug if off else ""
            else:
                off = self.db.get(RepairOffering, row.owner_id)
                name = off.name if off else ""
                slug = off.slug if off else ""
            out.append({"owner_type": row.owner_type, "owner_slug": slug, "owner_name": name})
        return out


def seed_catalog_kits(db: Session) -> None:
    """Join demo SKUs to repair offerings when both exist. Safe to call repeatedly."""
    for slug, sku_code in KIT_SKU_MAP.items():
        offering = db.scalar(select(RepairOffering).where(RepairOffering.slug == slug))
        sku = db.scalar(select(InventorySku).where(InventorySku.sku_code == sku_code))
        if offering is None or sku is None:
            continue
        exists = db.scalar(
            select(CatalogKitLine).where(
                CatalogKitLine.owner_type == "REPAIR_OFFERING",
                CatalogKitLine.owner_id == offering.id,
                CatalogKitLine.sku_id == sku.id,
            )
        )
        if exists is None:
            db.add(
                CatalogKitLine(
                    owner_type="REPAIR_OFFERING",
                    owner_id=offering.id,
                    sku_id=sku.id,
                    quantity=1,
                    line_kind="PART",
                    label=offering.name,
                    sort_order=0,
                )
            )
    gs = db.scalar(select(ServiceOffering).where(ServiceOffering.slug == GS_SLUG))
    if gs is not None:
        labour = db.scalar(
            select(CatalogKitLine).where(
                CatalogKitLine.owner_type == "SERVICE_OFFERING",
                CatalogKitLine.owner_id == gs.id,
                CatalogKitLine.line_kind == "LABOUR",
            )
        )
        if labour is None:
            db.add(
                CatalogKitLine(
                    owner_type="SERVICE_OFFERING",
                    owner_id=gs.id,
                    sku_id=None,
                    quantity=1,
                    line_kind="LABOUR",
                    label="General service labour",
                    sort_order=0,
                )
            )
    db.flush()
