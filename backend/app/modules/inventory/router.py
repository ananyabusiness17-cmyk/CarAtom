from typing import Annotated

from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_role
from app.core.idempotency import lookup_idempotency, store_idempotency
from app.db.session import get_db
from app.modules.inventory.schemas import (
    CreateSkuRequest,
    JobUsageResponse,
    MovementRequest,
    MovementResponse,
    PartsHistoryResponse,
    PatchSkuRequest,
    SkuListResponse,
    SkuStockOut,
)
from app.modules.inventory.service import InventoryService

router = APIRouter(tags=["admin-inventory"])


@router.get("/inventory/skus", response_model=SkuListResponse)
def list_skus(
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[CurrentUser, Depends(require_role("admin"))],
    q: str | None = None,
    low_stock: bool | None = None,
    location: str | None = None,
    cursor: str | None = None,
    limit: int = 50,
) -> SkuListResponse:
    return InventoryService(db).list_skus(
        q=q, low_stock=low_stock, location=location, cursor=cursor, limit=min(max(limit, 1), 100)
    )


@router.post("/inventory/skus", response_model=SkuStockOut, status_code=201)
def create_sku(
    body: CreateSkuRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[CurrentUser, Depends(require_role("admin"))],
) -> SkuStockOut:
    request_id = getattr(request.state, "request_id", None)
    result = InventoryService(db).create_sku(body, admin, request_id)
    db.commit()
    return result


@router.patch("/inventory/skus/{sku_id}", response_model=SkuStockOut)
def patch_sku(
    sku_id: str,
    body: PatchSkuRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[CurrentUser, Depends(require_role("admin"))],
) -> SkuStockOut:
    result = InventoryService(db).patch_sku(
        sku_id, body, admin, getattr(request.state, "request_id", None)
    )
    db.commit()
    return result


@router.get("/inventory/skus/{sku_id}/stock")
def sku_stock(
    sku_id: str,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[CurrentUser, Depends(require_role("admin"))],
    cursor: str | None = None,
):
    return InventoryService(db).sku_detail(sku_id, cursor=cursor)


@router.post("/inventory/movements", response_model=MovementResponse, status_code=201)
def create_movement(
    body: MovementRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[CurrentUser, Depends(require_role("admin"))],
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> MovementResponse:
    route = "POST /v1/admin/inventory/movements"
    cached = lookup_idempotency(db, idempotency_key, route)
    if cached is not None:
        return MovementResponse.model_validate(cached["body"])
    result = InventoryService(db).move(body, admin, getattr(request.state, "request_id", None))
    store_idempotency(db, idempotency_key, route, 201, result.model_dump(mode="json"), admin.id)
    db.commit()
    return result


@router.get("/inventory/job-usage/{job_card_id}", response_model=JobUsageResponse)
def job_usage(
    job_card_id: str,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[CurrentUser, Depends(require_role("admin"))],
) -> JobUsageResponse:
    return InventoryService(db).job_usage(job_card_id)


@router.get("/customers/{profile_id}/parts-history", response_model=PartsHistoryResponse)
def parts_history(
    profile_id: str,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[CurrentUser, Depends(require_role("admin"))],
) -> PartsHistoryResponse:
    return InventoryService(db).parts_history(profile_id)
