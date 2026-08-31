import json
import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.types import ASGIApp

logger = logging.getLogger("caratom.access")


class RequestIdMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-Id") or str(uuid.uuid4())
        request.state.request_id = request_id
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        response.headers["X-Request-Id"] = request_id
        logger.info(
            json.dumps(
                {
                    "route": request.url.path,
                    "method": request.method,
                    "status": response.status_code,
                    "latency_ms": duration_ms,
                    "request_id": request_id,
                }
            )
        )
        return response
