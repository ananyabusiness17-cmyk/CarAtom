from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.core.deps import CurrentUser, get_optional_user
from app.modules.geo.nominatim import nominatim_reverse, nominatim_search
from app.modules.geo.schemas import GeocodeSearchResponse, ReverseGeocodeOut

router = APIRouter()


def _coords_fallback(lat: float, lng: float) -> ReverseGeocodeOut:
    return ReverseGeocodeOut(
        label=f"{lat:.5f}, {lng:.5f}",
        latitude=lat,
        longitude=lng,
        source="coords",
    )


@router.get("/reverse", response_model=ReverseGeocodeOut)
def reverse_geocode(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    _user: Annotated[CurrentUser | None, Depends(get_optional_user)] = None,
) -> ReverseGeocodeOut:
    result = nominatim_reverse(lat, lng)
    if result is None:
        return _coords_fallback(lat, lng)
    return ReverseGeocodeOut.model_validate(result)


@router.get("/search", response_model=GeocodeSearchResponse)
def search_geocode(
    q: str = Query(..., min_length=2, max_length=200),
    _user: Annotated[CurrentUser | None, Depends(get_optional_user)] = None,
) -> GeocodeSearchResponse:
    items = [ReverseGeocodeOut.model_validate(row) for row in nominatim_search(q)]
    return GeocodeSearchResponse(items=items)
