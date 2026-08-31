from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common.errors import DomainProblem
from app.modules.vehicles.models import Vehicle, VehicleServiceLog
from app.modules.vehicles.schemas import VehicleIn, VehicleOut


class VehicleService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_for(self, profile_id: str) -> list[VehicleOut]:
        rows = self.db.scalars(
            select(Vehicle).where(Vehicle.profile_id == profile_id, Vehicle.is_archived.is_(False))
        ).all()
        return [self._out(row) for row in rows]

    def create(self, profile_id: str, body: VehicleIn) -> VehicleOut:
        row = Vehicle(
            id=str(uuid4()),
            profile_id=profile_id,
            make=body.make,
            model=body.model,
            year=body.year,
            fuel_type=body.fuel_type,
            transmission=body.transmission,
            registration_number=body.registration_number,
            variant=body.variant,
            mileage_km=body.mileage_km,
        )
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return self._out(row)

    def patch(self, profile_id: str, vehicle_id: str, body: VehicleIn) -> VehicleOut:
        row = self.db.get(Vehicle, vehicle_id)
        if row is None or row.profile_id != profile_id or row.is_archived:
            raise DomainProblem(404, "NOT_FOUND", "Not found.")
        row.make = body.make
        row.model = body.model
        row.year = body.year
        row.fuel_type = body.fuel_type
        row.transmission = body.transmission
        row.registration_number = body.registration_number
        row.variant = body.variant
        row.mileage_km = body.mileage_km
        row.updated_at = datetime.now(UTC)
        self.db.commit()
        self.db.refresh(row)
        return self._out(row)

    def history_for(self, profile_id: str, vehicle_id: str) -> list[VehicleServiceLog]:
        row = self.db.get(Vehicle, vehicle_id)
        if row is None or row.profile_id != profile_id or row.is_archived:
            raise DomainProblem(404, "NOT_FOUND", "Not found.")
        return list(
            self.db.scalars(
                select(VehicleServiceLog)
                .where(VehicleServiceLog.vehicle_id == vehicle_id)
                .order_by(VehicleServiceLog.created_at.desc())
            ).all()
        )

    def history_admin(self, vehicle_id: str) -> list[VehicleServiceLog]:
        row = self.db.get(Vehicle, vehicle_id)
        if row is None:
            raise DomainProblem(404, "NOT_FOUND", "Not found.")
        return list(
            self.db.scalars(
                select(VehicleServiceLog)
                .where(VehicleServiceLog.vehicle_id == vehicle_id)
                .order_by(VehicleServiceLog.created_at.desc())
            ).all()
        )

    def _out(self, row: Vehicle) -> VehicleOut:
        return VehicleOut(
            id=row.id,
            make=row.make,
            model=row.model,
            year=row.year,
            fuel_type=row.fuel_type,
            transmission=row.transmission,
            is_archived=row.is_archived,
            created_at=row.created_at,
            mileage_km=row.mileage_km,
        )
