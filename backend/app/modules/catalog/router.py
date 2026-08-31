from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.catalog.schemas import (
    CatalogHomeResponse,
    ServiceDetailResponse,
    ServiceListResponse,
)
from app.modules.catalog.service import CatalogQueryService

router = APIRouter()


class CatalogUnavailable(Exception):
    def __init__(self, request_id: str | None) -> None:
        self.request_id = request_id
        super().__init__("Catalog unavailable")


class NotFound(Exception):
    def __init__(self, request_id: str | None, message: str = "Not found.") -> None:
        self.request_id = request_id
        self.message = message
        super().__init__(message)


@router.get("/catalog/home", response_model=CatalogHomeResponse)
def catalog_home(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    service_area_slug: str | None = None,
    locale: str = "en-IN",
) -> CatalogHomeResponse:
    try:
        return CatalogQueryService(db).home(service_area_slug, locale)
    except LookupError:
        raise CatalogUnavailable(getattr(request.state, "request_id", None)) from None


@router.get("/services", response_model=ServiceListResponse)
def list_services(
    db: Annotated[Session, Depends(get_db)],
    flow_policy: str | None = None,
    category_slug: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
) -> ServiceListResponse:
    return CatalogQueryService(db).list_services(flow_policy, category_slug, page, page_size)


@router.get("/services/{slug}", response_model=ServiceDetailResponse)
def get_service(
    slug: str,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
) -> ServiceDetailResponse:
    detail = CatalogQueryService(db).get_by_slug(slug)
    if detail is None:
        raise NotFound(getattr(request.state, "request_id", None), "Service not found.")
    return detail
