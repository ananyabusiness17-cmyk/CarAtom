from __future__ import annotations

import os
from collections import defaultdict, deque
from time import monotonic

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.common.errors import problem


def _testing() -> bool:
    return os.environ.get("PYTEST_CURRENT_TEST") is not None


# path prefix -> (max_requests, window_seconds). First match wins — keep specific rules first.
RULES: list[tuple[str, str, int, int]] = [
    ("GET", "/v1/geo/", 30, 60),
    ("GET", "/v1/catalog/", 120, 60),
    ("POST", "/v1/media/signed-upload", 20, 60),
    ("POST", "/v1/support-tickets", 10, 60),
    ("POST", "/v1/dev/", 30, 60),
    ("POST", "/v1/payments/webhook/razorpay", 1000, 60),
    ("POST", "/v1/invoices/", 20, 60),
    ("POST", "/v1/reviews", 20, 60),
    ("POST", "/v1/admin/job-cards/", 30, 3600),
    ("POST", "/v1/admin/inventory/movements", 100, 3600),
    ("PATCH", "/v1/admin/catalog/", 60, 3600),
    ("POST", "/v1/admin/bookings/on-behalf", 50, 3600),
    ("PUT", "/v1/me/device-push-token", 10, 3600),
    ("POST", "/v1/analytics/events", 60, 60),
    ("POST", "/v1/admin/notifications/outbox/", 30, 3600),
    ("GET", "/v1/admin/", 300, 60),
    ("POST", "/v1/admin/", 300, 60),
    ("PATCH", "/v1/admin/", 300, 60),
    ("PUT", "/v1/admin/", 300, 60),
    ("DELETE", "/v1/admin/", 300, 60),
]


def match_rule(method: str, path: str) -> tuple[int, int] | None:
    for rule_method, prefix, limit, window in RULES:
        if method == rule_method and path.startswith(prefix):
            return limit, window
    return None


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    async def dispatch(self, request: Request, call_next):
        if _testing():
            return await call_next(request)
        matched = match_rule(request.method, request.url.path)
        if matched is None:
            return await call_next(request)
        limit, window = matched
        client = request.client.host if request.client else "unknown"
        key = f"{client}:{request.method}:{request.url.path.split('?')[0]}"
        now = monotonic()
        bucket = self._hits[key]
        while bucket and now - bucket[0] > window:
            bucket.popleft()
        if len(bucket) >= limit:
            request_id = getattr(request.state, "request_id", None)
            response: JSONResponse = problem(
                429, "RATE_LIMITED", "Too many requests. Try again shortly.", request_id
            )
            response.headers["Retry-After"] = str(window)
            return response
        bucket.append(now)
        return await call_next(request)
