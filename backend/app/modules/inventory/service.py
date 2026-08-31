from datetime import UTC, datetime
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common.errors import DomainProblem
from app.core.deps import CurrentUser
from app.db.models import Profile
from app.modules.audit.service import AuditService, require_reason
from app.modules.field_work.models import JobPart
from app.modules.inventory.invariants import assert_location, assert_movement_type
from app.modules.inventory.models import InventoryMovement, InventorySku
from app.modules.inventory.repository import InventoryRepository
from app.modules.catalog.kit_service import KitService
from app.modules.inventory.schemas import (
    CreateSkuRequest,
    JobUsageLineOut,
    JobUsageResponse,
    MovementRequest,
    MovementResponse,
    MovementRowOut,
    PartsHistoryJobOut,
    PartsHistoryResponse,
    PartsHistoryVehicleOut,
    PatchSkuRequest,
    SkuStockOut,
    StockLocationOut,
)
from app.modules.job_cards.models import JobCard
from app.modules.technicians.models import Technician
from app.modules.vehicles.models import Vehicle
from app.modules.visits.models import TechnicianAssignment, Visit


class InventoryService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = InventoryRepository(db)
        self.audit = AuditService(db)

    def _to_out(self, sku: InventorySku) -> SkuStockOut:
        stock = self.repo.stock_map(sku.id)
        total = sum(stock.values())
        return SkuStockOut(
            id=sku.id,
            sku_code=sku.sku_code,
            name=sku.name,
            oem_code=sku.oem_code,
            unit=sku.unit,
            stock_by_location={k: v for k, v in stock.items() if v or k in ("WH", "VAN_A")},
            total_quantity=total,
            low_stock_threshold=sku.low_stock_threshold,
            is_low_stock=total <= sku.low_stock_threshold,
            is_active=sku.is_active,
        )

    def list_skus(self, **kwargs):
        from app.modules.inventory.schemas import SkuListResponse

        rows, next_cursor = self.repo.list_skus(**kwargs)
        return SkuListResponse(
            items=[self._to_out(row) for row in rows],
            next_cursor=next_cursor,
            low_stock_count=self.repo.low_stock_count(),
        )

    def create_sku(
        self, body: CreateSkuRequest, actor: CurrentUser, request_id: str | None
    ) -> SkuStockOut:
        existing = self.repo.get_sku_by_code(body.sku_code.strip().upper())
        if existing is not None:
            raise DomainProblem(409, "SKU_EXISTS", "SKU code already exists.")
        sku = InventorySku(
            id=str(uuid4()),
            sku_code=body.sku_code.strip().upper(),
            name=body.name.strip(),
            oem_code=body.oem_code,
            unit=body.unit,
            low_stock_threshold=body.low_stock_threshold,
        )
        self.db.add(sku)
        self.db.flush()
        self.audit.record(
            actor,
            "inventory.create_sku",
            "inventory_sku",
            sku.id,
            after={"sku_code": sku.sku_code, "name": sku.name},
            request_id=request_id,
        )
        return self._to_out(sku)

    def patch_sku(
        self, sku_id: str, body: PatchSkuRequest, actor: CurrentUser, request_id: str | None
    ) -> SkuStockOut:
        sku = self.repo.get_sku(sku_id)
        if sku is None:
            raise DomainProblem(404, "NOT_FOUND", "SKU not found.")
        before = {"name": sku.name, "low_stock_threshold": sku.low_stock_threshold}
        if body.name is not None:
            sku.name = body.name.strip()
        if body.oem_code is not None:
            sku.oem_code = body.oem_code
        if body.low_stock_threshold is not None:
            sku.low_stock_threshold = body.low_stock_threshold
        if body.is_active is not None:
            sku.is_active = body.is_active
        sku.updated_at = datetime.now(UTC)
        self.audit.record(
            actor,
            "inventory.patch_sku",
            "inventory_sku",
            sku.id,
            before=before,
            after={"name": sku.name, "low_stock_threshold": sku.low_stock_threshold},
            request_id=request_id,
        )
        return self._to_out(sku)

    def get_sku(self, sku_id: str) -> SkuStockOut:
        sku = self.repo.get_sku(sku_id)
        if sku is None:
            raise DomainProblem(404, "NOT_FOUND", "SKU not found.")
        return self._to_out(sku)

    def sku_detail(self, sku_id: str, cursor: str | None = None, limit: int = 30) -> dict:
        sku = self.repo.get_sku(sku_id)
        if sku is None:
            raise DomainProblem(404, "NOT_FOUND", "SKU not found.")
        query = (
            select(InventoryMovement)
            .where(InventoryMovement.sku_id == sku_id)
            .order_by(InventoryMovement.created_at.desc())
        )
        if cursor:
            created = datetime.fromisoformat(cursor)
            if created.tzinfo is None:
                created = created.replace(tzinfo=UTC)
            query = query.where(InventoryMovement.created_at < created)
        rows = list(self.db.scalars(query.limit(limit + 1)).all())
        next_cursor = None
        if len(rows) > limit:
            next_cursor = rows[limit - 1].created_at.isoformat()
            rows = rows[:limit]
        return {
            "sku": self._to_out(sku),
            "stock": [
                StockLocationOut(location_code=k, quantity=v)
                for k, v in self.repo.stock_map(sku.id).items()
            ],
            "movements": [
                MovementRowOut(
                    id=row.id,
                    movement_type=row.movement_type,
                    location_code=row.location_code,
                    quantity=row.quantity,
                    reason=row.reason,
                    reference=row.reference,
                    created_at=row.created_at,
                    job_card_id=row.job_card_id,
                )
                for row in rows
            ],
            "next_cursor": next_cursor,
            "used_by": KitService(self.db).used_by_sku(sku.id),
        }

    def move(
        self, body: MovementRequest, actor: CurrentUser, request_id: str | None
    ) -> MovementResponse:
        movement_type = assert_movement_type(body.movement_type)
        location = assert_location(body.location_code)
        sku = self.repo.get_sku(body.sku_id)
        if sku is None:
            raise DomainProblem(404, "NOT_FOUND", "SKU not found.")
        reason = body.reason.strip()
        if movement_type in {"ADJUST", "REVERSE", "CONSUME"} or body.adjust_delta < 0:
            reason = require_reason(body.reason)
        elif not reason:
            reason = "Stock movement"

        before = self.repo.stock_map(sku.id)
        if movement_type == "RECEIVE":
            self.repo.apply_delta(sku.id, location, body.quantity)
        elif movement_type == "CONSUME":
            self.repo.apply_delta(sku.id, location, -body.quantity)
        elif movement_type == "REVERSE":
            self.repo.apply_delta(sku.id, location, body.quantity)
        elif movement_type == "ADJUST":
            self.repo.apply_delta(sku.id, location, body.adjust_delta * body.quantity)
        elif movement_type == "TRANSFER":
            dest = assert_location(body.to_location_code or "")
            self.repo.apply_delta(sku.id, location, -body.quantity)
            self.repo.apply_delta(sku.id, dest, body.quantity)
        else:
            raise DomainProblem(422, "INVALID_MOVEMENT_TYPE", "Unsupported movement.")

        movement = self.repo.add_movement(
            sku_id=sku.id,
            movement_type=movement_type,
            location_code=location,
            quantity=body.quantity,
            to_location_code=body.to_location_code,
            job_card_id=body.job_card_id,
            visit_id=body.visit_id,
            job_part_id=body.job_part_id,
            actor_id=actor.id,
            reason=reason,
            reference=body.reference,
        )
        after = self.repo.stock_map(sku.id)
        audit_id = self.audit.record(
            actor,
            f"inventory.{movement_type.lower()}",
            "inventory_sku",
            sku.id,
            reason=reason,
            before=before,
            after=after,
            request_id=request_id,
        )
        return MovementResponse(
            movement_id=movement.id,
            sku_id=sku.id,
            stock_by_location={k: v for k, v in after.items() if v or k in ("WH", "VAN_A")},
            total_quantity=sum(after.values()),
            audit_id=audit_id,
        )

    def consume_for_part(
        self,
        part: JobPart,
        actor: CurrentUser,
        *,
        location: str | None = None,
        request_id: str | None = None,
    ) -> str | None:
        sku = self.repo.get_sku_by_code(part.sku_code)
        if sku is None:
            return None
        loc = assert_location(location or "VAN_A")
        qty = max(int(Decimal(str(part.quantity))), 1)
        self.repo.apply_delta(sku.id, loc, -qty)
        movement = self.repo.add_movement(
            sku_id=sku.id,
            movement_type="CONSUME",
            location_code=loc,
            quantity=qty,
            job_card_id=part.job_card_id,
            visit_id=part.visit_id,
            job_part_id=part.id,
            actor_id=actor.id,
            reason="Technician fitted part on visit",
        )
        part.inventory_movement_id = movement.id
        self.audit.record(
            actor,
            "inventory.consume",
            "inventory_sku",
            sku.id,
            reason="Technician fitted part on visit",
            after=self.repo.stock_map(sku.id),
            request_id=request_id,
        )
        return movement.id

    def job_usage(self, job_card_id: str) -> JobUsageResponse:
        job = self.db.get(JobCard, job_card_id)
        if job is None:
            raise DomainProblem(404, "NOT_FOUND", "Job card not found.")
        parts = list(
            self.db.scalars(select(JobPart).where(JobPart.job_card_id == job_card_id)).all()
        )
        customer = self.db.get(Profile, job.profile_id) if job.profile_id else None
        ctx = job.vehicle_context or {}
        vehicle_summary = (
            f"{ctx.get('make', '')} {ctx.get('model', '')} {ctx.get('year', '')}".strip()
        )
        tech_name = None
        visits = list(self.db.scalars(select(Visit).where(Visit.job_card_id == job_card_id)).all())
        visit_index = {
            v.id: idx + 1 for idx, v in enumerate(sorted(visits, key=lambda r: r.created_at))
        }
        for visit in visits:
            assignment = self.db.scalar(
                select(TechnicianAssignment).where(
                    TechnicianAssignment.visit_id == visit.id,
                    TechnicianAssignment.is_current.is_(True),
                )
            )
            if assignment is not None:
                tech = self.db.get(Technician, assignment.technician_id)
                if tech is not None:
                    tech_name = tech.display_name
                    break
        items: list[JobUsageLineOut] = []
        for part in parts:
            sku = self.repo.get_sku_by_code(part.sku_code)
            idx = visit_index.get(part.visit_id, 1)
            items.append(
                JobUsageLineOut(
                    sku_code=part.sku_code,
                    sku_name=sku.name if sku else part.label,
                    quantity=float(part.quantity),
                    visit_label=f"Visit {idx}",
                    visit_id=part.visit_id,
                    job_part_id=part.id,
                )
            )
        return JobUsageResponse(
            job_card_id=job.id,
            job_card_ref=job.public_ref,
            customer_name=customer.full_name if customer else None,
            vehicle_summary=vehicle_summary or None,
            technician_name=tech_name,
            items=items,
        )

    def parts_history(self, profile_id: str) -> PartsHistoryResponse:
        customer = self.db.get(Profile, profile_id)
        if customer is None:
            raise DomainProblem(404, "NOT_FOUND", "Customer not found.")
        jobs = list(
            self.db.scalars(
                select(JobCard)
                .where(JobCard.profile_id == profile_id)
                .order_by(JobCard.created_at.desc())
            ).all()
        )
        vehicles = list(
            self.db.scalars(select(Vehicle).where(Vehicle.profile_id == profile_id)).all()
        )
        by_vehicle: dict[str | None, PartsHistoryVehicleOut] = {}
        for vehicle in vehicles:
            label = f"{vehicle.make} {vehicle.model} {vehicle.year}".strip()
            by_vehicle[vehicle.id] = PartsHistoryVehicleOut(
                vehicle_id=vehicle.id, vehicle_label=label, jobs=[]
            )
        for job in jobs:
            parts = list(
                self.db.scalars(select(JobPart).where(JobPart.job_card_id == job.id)).all()
            )
            names: list[str] = []
            for part in parts:
                sku = self.repo.get_sku_by_code(part.sku_code)
                names.append(sku.name if sku else part.label)
            labels = ", ".join(sorted(set(names))) if names else "No parts yet"
            ctx = job.vehicle_context or {}
            vehicle_id = job.vehicle_id
            if vehicle_id not in by_vehicle:
                label = (
                    f"{ctx.get('make', '')} {ctx.get('model', '')} {ctx.get('year', '')}".strip()
                    or "Vehicle"
                )
                by_vehicle[vehicle_id] = PartsHistoryVehicleOut(
                    vehicle_id=vehicle_id, vehicle_label=label, jobs=[]
                )
            by_vehicle[vehicle_id].jobs.append(
                PartsHistoryJobOut(
                    job_card_id=job.id,
                    job_card_ref=job.public_ref,
                    sku_labels=labels,
                    completed_at=job.updated_at,
                )
            )
        return PartsHistoryResponse(
            customer_id=profile_id,
            customer_name=customer.full_name,
            vehicles=list(by_vehicle.values()),
        )
