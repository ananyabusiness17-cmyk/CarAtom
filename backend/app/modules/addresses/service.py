from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common.errors import DomainProblem
from app.modules.addresses.models import Address
from app.modules.addresses.schemas import AddressIn, AddressOut


class AddressService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_for(self, profile_id: str) -> list[AddressOut]:
        rows = self.db.scalars(
            select(Address).where(Address.profile_id == profile_id, Address.is_archived.is_(False))
        ).all()
        return [self._out(row) for row in rows]

    def create(self, profile_id: str, body: AddressIn) -> AddressOut:
        row = Address(
            id=str(uuid4()),
            profile_id=profile_id,
            label=body.label,
            line1=body.line1,
            line2=body.line2,
            locality=body.locality,
            city=body.city,
            postal_code=body.postal_code,
            latitude=body.latitude,
            longitude=body.longitude,
            is_default=body.is_default,
        )
        self.db.add(row)
        self.db.commit()
        self.db.refresh(row)
        return self._out(row)

    def patch(self, profile_id: str, address_id: str, body: AddressIn) -> AddressOut:
        row = self.db.get(Address, address_id)
        if row is None or row.profile_id != profile_id or row.is_archived:
            raise DomainProblem(404, "NOT_FOUND", "Not found.")
        row.label = body.label
        row.line1 = body.line1
        row.line2 = body.line2
        row.locality = body.locality
        row.city = body.city
        row.postal_code = body.postal_code
        row.latitude = body.latitude
        row.longitude = body.longitude
        row.is_default = body.is_default
        row.updated_at = datetime.now(UTC)
        self.db.commit()
        self.db.refresh(row)
        return self._out(row)

    def _out(self, row: Address) -> AddressOut:
        return AddressOut(
            id=row.id,
            line1=row.line1,
            locality=row.locality,
            city=row.city,
            postal_code=row.postal_code,
            latitude=row.latitude,
            longitude=row.longitude,
            is_default=row.is_default,
            is_archived=row.is_archived,
            created_at=row.created_at,
        )
