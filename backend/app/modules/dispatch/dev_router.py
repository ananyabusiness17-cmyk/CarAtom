from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.common.errors import DomainProblem
from app.config import settings
from app.core.deps import CurrentUser, get_optional_user
from app.core.dev_guard import require_dev_admin
from app.db.session import get_db
from app.modules.dispatch.service import DispatchService
from app.modules.technicians.models import Technician
from app.modules.visits.schemas import AssignResponse

router = APIRouter()


@router.post("/bookings/{booking_id}/auto-assign", response_model=AssignResponse, status_code=201)
def auto_assign(
    booking_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser | None, Depends(get_optional_user)],
) -> AssignResponse:
    admin = require_dev_admin(user)
    technician_id = settings.dev_auto_assign_technician_id
    if not technician_id:
        row = db.scalar(select(Technician).where(Technician.status == "active"))
        if row is None:
            raise DomainProblem(409, "NO_TECHNICIAN", "Seed a technician before auto-assign.")
        technician_id = row.id
    visit = DispatchService(db).assign_technician_to_booking(booking_id, technician_id, admin.id)
    db.commit()
    return AssignResponse(
        visit_id=visit.id,
        public_ref=visit.public_ref,
        status=visit.status,
        visit_type=visit.visit_type,
        audit_ref=f"dev-assign:{visit.id}",
    )
