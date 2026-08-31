from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_role
from app.db.session import get_db
from app.modules.admin.catalog_service import CatalogAdminService
from app.modules.admin.schemas import (
    CatalogOverviewResponse,
    PatchOfferingRequest,
    PatchOfferingResponse,
    PatchSettingsRequest,
)
from app.modules.catalog.kit_service import CatalogKitOut, CatalogKitPut, KitService

router = APIRouter(tags=["admin-catalog"])


@router.get("/catalog/overview", response_model=CatalogOverviewResponse)
def catalog_overview(
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[CurrentUser, Depends(require_role("admin"))],
) -> CatalogOverviewResponse:
    return CatalogAdminService(db).overview()


@router.patch("/catalog/offerings/{slug}", response_model=PatchOfferingResponse)
def patch_offering(
    slug: str,
    body: PatchOfferingRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[CurrentUser, Depends(require_role("admin"))],
) -> PatchOfferingResponse:
    result = CatalogAdminService(db).patch_offering(
        slug, body, admin, getattr(request.state, "request_id", None)
    )
    db.commit()
    return result


@router.patch("/catalog/repair-offerings/{slug}", response_model=PatchOfferingResponse)
def patch_repair(
    slug: str,
    body: PatchOfferingRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[CurrentUser, Depends(require_role("admin"))],
) -> PatchOfferingResponse:
    result = CatalogAdminService(db).patch_repair(
        slug, body, admin, getattr(request.state, "request_id", None)
    )
    db.commit()
    return result


@router.patch("/catalog/settings", response_model=CatalogOverviewResponse)
def patch_settings(
    body: PatchSettingsRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[CurrentUser, Depends(require_role("admin"))],
) -> CatalogOverviewResponse:
    result = CatalogAdminService(db).patch_settings(
        body, admin, getattr(request.state, "request_id", None)
    )
    db.commit()
    return result


@router.get("/catalog/kits", response_model=CatalogKitOut)
def get_catalog_kit(
    owner_type: str,
    owner_id: str,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[CurrentUser, Depends(require_role("admin"))],
) -> CatalogKitOut:
    return KitService(db).get_catalog_kit(owner_type, owner_id)


@router.put("/catalog/kits", response_model=CatalogKitOut)
def put_catalog_kit(
    body: CatalogKitPut,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[CurrentUser, Depends(require_role("admin"))],
) -> CatalogKitOut:
    result = KitService(db).replace_catalog_kit(body)
    db.commit()
    return result
