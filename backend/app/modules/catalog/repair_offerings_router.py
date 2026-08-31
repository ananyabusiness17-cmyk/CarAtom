from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.catalog.repair_service import RepairOfferingService

router = APIRouter()


class MoneyOut(BaseModel):
    amount_minor: int
    currency: str = "INR"


class CategoryOut(BaseModel):
    id: str
    name: str
    slug: str | None = None


class RepairOfferingOut(BaseModel):
    id: str
    slug: str
    name: str
    display_price: MoneyOut
    category: CategoryOut | None = None
    icon_key: str | None = None
    compatible: bool = True


class RepairOfferingListResponse(BaseModel):
    items: list[RepairOfferingOut]


@router.get("/repair-offerings", response_model=RepairOfferingListResponse)
def list_repair_offerings(
    db: Annotated[Session, Depends(get_db)],
    category_id: str | None = None,
    query: str | None = Query(default=None, alias="query"),
    vehicle_make: str | None = None,
    vehicle_model: str | None = None,
    vehicle_year: int | None = None,
) -> RepairOfferingListResponse:
    items = RepairOfferingService(db).list_offerings(
        category_id=category_id,
        query=query,
        vehicle_make=vehicle_make,
        vehicle_model=vehicle_model,
        vehicle_year=vehicle_year,
    )
    return RepairOfferingListResponse(
        items=[RepairOfferingOut.model_validate(row) for row in items]
    )
