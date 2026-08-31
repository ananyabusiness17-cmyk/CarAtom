from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_role
from app.db.session import get_db
from app.modules.admin.people_service import PeopleAdminService
from app.modules.admin.schemas import (
    CreateTechnicianRequest,
    CustomerDetailOut,
    DisableProfileRequest,
    DisableProfileResponse,
    PeopleListResponse,
    TechnicianDossierOut,
)

router = APIRouter(tags=["admin-people"])


@router.get("/people", response_model=PeopleListResponse)
def search_people(
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[CurrentUser, Depends(require_role("admin"))],
    q: str | None = None,
) -> PeopleListResponse:
    return PeopleAdminService(db).search(q)


@router.get("/customers/{profile_id}", response_model=CustomerDetailOut)
def customer_detail(
    profile_id: str,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[CurrentUser, Depends(require_role("admin"))],
) -> CustomerDetailOut:
    return PeopleAdminService(db).customer_detail(profile_id)


@router.post("/technicians", status_code=201)
def create_technician(
    body: CreateTechnicianRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[CurrentUser, Depends(require_role("admin"))],
):
    result = PeopleAdminService(db).create_technician(
        body, admin, getattr(request.state, "request_id", None)
    )
    db.commit()
    return result


@router.patch("/profiles/{profile_id}/disable", response_model=DisableProfileResponse)
def disable_profile(
    profile_id: str,
    body: DisableProfileRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[CurrentUser, Depends(require_role("admin"))],
) -> DisableProfileResponse:
    result = PeopleAdminService(db).disable(
        profile_id, body, admin, getattr(request.state, "request_id", None)
    )
    db.commit()
    return result


@router.get("/technicians/{technician_id}/dossier", response_model=TechnicianDossierOut)
def technician_dossier(
    technician_id: str,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[CurrentUser, Depends(require_role("admin"))],
) -> TechnicianDossierOut:
    return PeopleAdminService(db).dossier(technician_id)


@router.get("/vehicles/{vehicle_id}/history")
def admin_vehicle_history(
    vehicle_id: str,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[CurrentUser, Depends(require_role("admin"))],
):
    from app.modules.vehicles.schemas import VehicleServiceLogList, VehicleServiceLogOut
    from app.modules.vehicles.service import VehicleService

    rows = VehicleService(db).history_admin(vehicle_id)
    return VehicleServiceLogList(
        items=[
            VehicleServiceLogOut(
                id=row.id,
                vehicle_id=row.vehicle_id,
                visit_id=row.visit_id,
                offering_slug=row.offering_slug,
                invoice_total_minor=row.invoice_total_minor,
                odometer_km=row.odometer_km,
                notes=row.notes,
                created_at=row.created_at,
            )
            for row in rows
        ]
    )
