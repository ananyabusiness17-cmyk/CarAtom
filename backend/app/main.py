import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.common.errors import DomainProblem, problem
from app.config import settings
from app.core.auth import AuthError
from app.core.deps import RoleDenied, auth_error_response, role_denied_response
from app.core.rate_limit import RateLimitMiddleware
from app.middleware.request_id import RequestIdMiddleware
from app.modules.addresses.router import router as addresses_router
from app.modules.admin.audit_router import router as admin_audit_router
from app.modules.admin.catalog_router import router as admin_catalog_router
from app.modules.admin.job_cards_router import router as admin_job_cards_router
from app.modules.admin.on_behalf_router import router as admin_on_behalf_router
from app.modules.admin.override_router import router as admin_override_router
from app.modules.admin.payments_router import router as admin_payments_router
from app.modules.admin.people_router import router as admin_people_router
from app.modules.admin.router import router as admin_ops_router
from app.modules.advisor.router import router as advisor_router
from app.modules.bookings.router import router as bookings_router
from app.modules.catalog.repair_offerings_router import router as repair_offerings_router
from app.modules.catalog.router import CatalogUnavailable, NotFound
from app.modules.catalog.router import router as catalog_router
from app.modules.dev.simulate_router import router as simulate_router
from app.modules.dispatch.dev_router import router as dispatch_dev_router
from app.modules.dispatch.router import router as dispatch_admin_router
from app.modules.geo.router import router as geo_router
from app.modules.health.router import router as health_router
from app.modules.inspection_repair.router import router as inspection_repair_router
from app.modules.inventory.router import router as admin_inventory_router
from app.modules.invoices.router import router as invoices_router
from app.modules.job_cards.router import router as job_cards_router
from app.modules.media.router import router as media_router
from app.modules.notifications.router import admin_router as notifications_admin_router
from app.modules.notifications.router import analytics_router
from app.modules.notifications.router import router as notifications_router
from app.modules.payments.router import router as payments_router
from app.modules.profiles.router import admin_router
from app.modules.profiles.router import router as profiles_router
from app.modules.reviews.router import router as reviews_router
from app.modules.slots.router import router as slots_router
from app.modules.support.router import admin_router as support_admin_router
from app.modules.support.router import router as support_router
from app.modules.technicians.router import router as technician_router
from app.modules.vehicles.router import router as vehicles_router

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("caratom")


def _bootstrap_sqlite() -> None:
    if not settings.database_url.startswith("sqlite"):
        return
    from app.db.models import Base
    from app.db.session import SessionLocal, engine
    from app.modules.catalog.seed import seed_catalog
    from app.modules.slots.seed import seed_scheduling

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_catalog(db)
        seed_scheduling(db)
        logger.info("sqlite catalog seed complete")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    _bootstrap_sqlite()
    yield


_docs_enabled = settings.env != "production"

app = FastAPI(
    title="CARATOM API",
    version=settings.api_version,
    openapi_url="/openapi.json" if _docs_enabled else None,
    docs_url="/docs" if _docs_enabled else None,
    redoc_url="/redoc" if _docs_enabled else None,
    lifespan=lifespan,
)

app.add_middleware(RequestIdMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, tags=["health"])
app.include_router(geo_router, prefix="/v1/geo", tags=["geo"])
app.include_router(profiles_router, prefix="/v1", tags=["profiles"])
app.include_router(vehicles_router, prefix="/v1", tags=["vehicles"])
app.include_router(addresses_router, prefix="/v1", tags=["addresses"])
app.include_router(admin_router, prefix="/v1/admin", tags=["admin"])
app.include_router(admin_ops_router, prefix="/v1/admin", tags=["admin"])
app.include_router(admin_inventory_router, prefix="/v1/admin")
app.include_router(admin_catalog_router, prefix="/v1/admin")
app.include_router(admin_people_router, prefix="/v1/admin")
app.include_router(admin_payments_router, prefix="/v1/admin")
app.include_router(admin_on_behalf_router, prefix="/v1/admin")
app.include_router(admin_job_cards_router, prefix="/v1/admin")
app.include_router(admin_override_router, prefix="/v1/admin")
app.include_router(admin_audit_router, prefix="/v1/admin")
app.include_router(catalog_router, prefix="/v1", tags=["catalog"])
app.include_router(repair_offerings_router, prefix="/v1", tags=["catalog"])
app.include_router(job_cards_router, prefix="/v1", tags=["job-cards"])
app.include_router(inspection_repair_router, prefix="/v1", tags=["inspection-repair"])
app.include_router(advisor_router, prefix="/v1", tags=["advisor"])
app.include_router(slots_router, prefix="/v1", tags=["slots"])
app.include_router(bookings_router, prefix="/v1", tags=["bookings"])
app.include_router(invoices_router, prefix="/v1", tags=["invoices"])
app.include_router(payments_router, prefix="/v1", tags=["payments"])
app.include_router(reviews_router, prefix="/v1", tags=["reviews"])
app.include_router(notifications_router, prefix="/v1", tags=["notifications"])
app.include_router(notifications_admin_router, prefix="/v1/admin", tags=["admin-notifications"])
app.include_router(analytics_router, prefix="/v1", tags=["analytics"])
app.include_router(support_router, prefix="/v1", tags=["support"])
app.include_router(support_admin_router, prefix="/v1/admin", tags=["admin"])
app.include_router(technician_router, prefix="/v1/technician", tags=["technician"])
app.include_router(media_router, prefix="/v1/media", tags=["media"])
app.include_router(dispatch_admin_router, prefix="/v1/admin", tags=["admin-dispatch"])
app.include_router(simulate_router, prefix="/v1/dev", tags=["dev"])
app.include_router(dispatch_dev_router, prefix="/v1/dev", tags=["dev"])


@app.exception_handler(AuthError)
def handle_auth_error(request: Request, exc: AuthError):
    return auth_error_response(request, exc)


@app.exception_handler(RoleDenied)
def handle_role_denied(request: Request, exc: RoleDenied):
    return role_denied_response(request, exc)


@app.exception_handler(CatalogUnavailable)
def handle_catalog_unavailable(request: Request, exc: CatalogUnavailable):
    return problem(503, "CATALOG_UNAVAILABLE", "Catalog is not seeded yet.", exc.request_id)


@app.exception_handler(NotFound)
def handle_not_found(request: Request, exc: NotFound):
    return problem(404, "NOT_FOUND", exc.message, exc.request_id)


@app.exception_handler(DomainProblem)
def handle_domain_problem(request: Request, exc: DomainProblem):
    request_id = exc.request_id or getattr(request.state, "request_id", None)
    return problem(
        exc.status,
        exc.code,
        exc.message,
        request_id,
        retryable=exc.retryable,
        allowed_actions=exc.allowed_actions,
        details=exc.details,
    )
