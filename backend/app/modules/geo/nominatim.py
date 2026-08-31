"""OpenStreetMap Nominatim geocoding (same pattern as Civic Agent).

Tiles stay on-device via OSM raster URLs. Nominatim is called from the API so
the mobile apps never skip a User-Agent and we can bound search to Bengaluru.
"""

from __future__ import annotations

from typing import Any

import httpx

from app.config import settings

NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse"
NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search"

# Bengaluru metro — Nominatim viewbox is west,north,east,south.
BENGALURU_VIEWBOX = "77.35,13.15,77.85,12.70"


def short_address(display_name: str) -> str:
    parts = [part.strip() for part in display_name.split(",") if part.strip()]
    return ", ".join(parts[:4]) if parts else display_name


def _headers() -> dict[str, str]:
    return {
        "User-Agent": settings.nominatim_user_agent,
        "Accept": "application/json",
        "Accept-Language": "en-IN,en",
    }


def parse_nominatim_payload(
    payload: dict[str, Any],
    *,
    lat: float,
    lng: float,
) -> dict[str, Any]:
    display = payload.get("display_name")
    address = payload.get("address") if isinstance(payload.get("address"), dict) else {}
    label = (
        short_address(display)
        if isinstance(display, str) and display.strip()
        else (f"{lat:.5f}, {lng:.5f}")
    )
    locality = (
        address.get("suburb")
        or address.get("neighbourhood")
        or address.get("city_district")
        or address.get("town")
    )
    city = address.get("city") or address.get("town") or address.get("state_district")
    postal = address.get("postcode")
    return {
        "label": label,
        "line1": address.get("road") or label,
        "locality": locality if isinstance(locality, str) else None,
        "city": city if isinstance(city, str) else None,
        "postal_code": postal if isinstance(postal, str) else None,
        "latitude": lat,
        "longitude": lng,
        "source": "nominatim",
    }


def nominatim_reverse(lat: float, lng: float) -> dict[str, Any] | None:
    try:
        response = httpx.get(
            NOMINATIM_REVERSE_URL,
            params={"format": "jsonv2", "lat": lat, "lon": lng, "addressdetails": "1"},
            headers=_headers(),
            timeout=settings.nominatim_timeout_seconds,
        )
        response.raise_for_status()
        payload = response.json()
    except (httpx.HTTPError, ValueError, TypeError):
        return None
    if not isinstance(payload, dict):
        return None
    if payload.get("error"):
        return None
    return parse_nominatim_payload(payload, lat=lat, lng=lng)


def nominatim_search(query: str) -> list[dict[str, Any]]:
    try:
        response = httpx.get(
            NOMINATIM_SEARCH_URL,
            params={
                "format": "jsonv2",
                "q": query,
                "countrycodes": "in",
                "limit": "5",
                "addressdetails": "1",
                "viewbox": BENGALURU_VIEWBOX,
                "bounded": "1",
            },
            headers=_headers(),
            timeout=settings.nominatim_timeout_seconds,
        )
        response.raise_for_status()
        payload = response.json()
    except (httpx.HTTPError, ValueError, TypeError):
        return []
    if not isinstance(payload, list):
        return []
    results: list[dict[str, Any]] = []
    for hit in payload:
        try:
            hit_lat = float(hit["lat"])
            hit_lng = float(hit["lon"])
        except (KeyError, TypeError, ValueError):
            continue
        parsed = parse_nominatim_payload(hit, lat=hit_lat, lng=hit_lng)
        results.append(parsed)
    return results
