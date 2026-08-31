from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_user
from app.db.session import get_db
from app.modules.vehicles.schemas import (
    VehicleIn,
    VehicleListResponse,
    VehicleOut,
    VehicleServiceLogList,
    VehicleServiceLogOut,
)
from app.modules.vehicles.service import VehicleService

router = APIRouter()


@router.get("/me/vehicles", response_model=VehicleListResponse)
def list_vehicles(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_user)],
) -> VehicleListResponse:
    return VehicleListResponse(items=VehicleService(db).list_for(user.id))


@router.post("/me/vehicles", response_model=VehicleOut, status_code=201)
def create_vehicle(
    body: VehicleIn,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_user)],
) -> VehicleOut:
    return VehicleService(db).create(user.id, body)


@router.patch("/me/vehicles/{vehicle_id}", response_model=VehicleOut)
def patch_vehicle(
    vehicle_id: str,
    body: VehicleIn,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_user)],
) -> VehicleOut:
    return VehicleService(db).patch(user.id, vehicle_id, body)


@router.get("/me/vehicles/{vehicle_id}/history", response_model=VehicleServiceLogList)
def vehicle_history(
    vehicle_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_user)],
) -> VehicleServiceLogList:
    rows = VehicleService(db).history_for(user.id, vehicle_id)
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
