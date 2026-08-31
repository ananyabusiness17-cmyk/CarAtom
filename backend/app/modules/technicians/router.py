import hashlib
import json
from typing import Annotated

from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy.orm import Session

from app.common.errors import DomainProblem
from app.core.deps import CurrentUser, require_role
from app.core.idempotency import lookup_idempotency, store_idempotency
from app.db.session import get_db
from app.modules.visits.schemas import (
    CompleteVisitBody,
    ExceptionRequest,
    InspectionFindingsRequest,
    LabourRequest,
    LabourResponse,
    LocationBody,
    LocationPingAccepted,
    LocationPingRequest,
    PartsRequest,
    PartsResponse,
    QcRequest,
    ScopeProgressRequest,
    TechnicianMeOut,
    TechnicianMePatch,
    TechnicianVisitDetail,
    VisitListResponse,
)
from app.modules.visits.service import VisitService

router = APIRouter()


def _require_key(key: str | None) -> str:
    if not key:
        raise DomainProblem(422, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key header is required.")
    return key


def _hash_body(payload: object) -> str:
    raw = json.dumps(payload, sort_keys=True, default=str)
    return hashlib.sha256(raw.encode()).hexdigest()


@router.get("/me", response_model=TechnicianMeOut)
def technician_me(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_role("technician"))],
) -> TechnicianMeOut:
    return VisitService(db).me(user)


@router.patch("/me", response_model=TechnicianMeOut)
def patch_technician_me(
    body: TechnicianMePatch,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_role("technician"))],
) -> TechnicianMeOut:
    result = VisitService(db).patch_me(user, body.on_duty)
    db.commit()
    return result


@router.get("/visits", response_model=VisitListResponse)
def list_visits(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_role("technician"))],
    date: Annotated[str, Query(pattern=r"^\d{4}-\d{2}-\d{2}$")],
) -> VisitListResponse:
    return VisitService(db).list_for_date(user, date)


@router.get("/visits/{visit_id}", response_model=TechnicianVisitDetail)
def get_visit(
    visit_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_role("technician"))],
) -> TechnicianVisitDetail:
    return VisitService(db).get_detail(user, visit_id)


@router.post("/visits/{visit_id}/en-route", response_model=TechnicianVisitDetail)
def en_route(
    visit_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_role("technician"))],
    body: LocationBody | None = None,
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> TechnicianVisitDetail:
    key = _require_key(idempotency_key)
    route = f"POST /v1/technician/visits/{visit_id}/en-route"
    payload = (body or LocationBody()).model_dump(mode="json")
    cached = lookup_idempotency(db, key, route, _hash_body(payload))
    if cached is not None:
        return TechnicianVisitDetail.model_validate(cached["body"])
    result = VisitService(db).en_route(user, visit_id, body or LocationBody())
    store_idempotency(
        db, key, route, 200, result.model_dump(mode="json"), user.id, _hash_body(payload)
    )
    db.commit()
    return result


@router.post("/visits/{visit_id}/check-in", response_model=TechnicianVisitDetail)
def check_in(
    visit_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_role("technician"))],
    body: LocationBody | None = None,
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> TechnicianVisitDetail:
    key = _require_key(idempotency_key)
    route = f"POST /v1/technician/visits/{visit_id}/check-in"
    payload = (body or LocationBody()).model_dump(mode="json")
    cached = lookup_idempotency(db, key, route, _hash_body(payload))
    if cached is not None:
        return TechnicianVisitDetail.model_validate(cached["body"])
    result = VisitService(db).check_in(user, visit_id, body or LocationBody())
    store_idempotency(
        db, key, route, 200, result.model_dump(mode="json"), user.id, _hash_body(payload)
    )
    db.commit()
    return result


@router.post("/visits/{visit_id}/start-inspection", response_model=TechnicianVisitDetail)
def start_inspection(
    visit_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_role("technician"))],
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> TechnicianVisitDetail:
    key = _require_key(idempotency_key)
    route = f"POST /v1/technician/visits/{visit_id}/start-inspection"
    cached = lookup_idempotency(db, key, route, _hash_body({}))
    if cached is not None:
        return TechnicianVisitDetail.model_validate(cached["body"])
    result = VisitService(db).start_inspection(user, visit_id)
    store_idempotency(db, key, route, 200, result.model_dump(mode="json"), user.id, _hash_body({}))
    db.commit()
    return result


@router.post("/visits/{visit_id}/start-service", response_model=TechnicianVisitDetail)
def start_service(
    visit_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_role("technician"))],
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> TechnicianVisitDetail:
    key = _require_key(idempotency_key)
    route = f"POST /v1/technician/visits/{visit_id}/start-service"
    cached = lookup_idempotency(db, key, route, _hash_body({}))
    if cached is not None:
        return TechnicianVisitDetail.model_validate(cached["body"])
    result = VisitService(db).start_service(user, visit_id)
    store_idempotency(db, key, route, 200, result.model_dump(mode="json"), user.id, _hash_body({}))
    db.commit()
    return result


@router.post("/visits/{visit_id}/inspection-findings", response_model=TechnicianVisitDetail)
def inspection_findings(
    visit_id: str,
    body: InspectionFindingsRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_role("technician"))],
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> TechnicianVisitDetail:
    key = _require_key(idempotency_key)
    route = f"POST /v1/technician/visits/{visit_id}/inspection-findings"
    payload = body.model_dump(mode="json")
    cached = lookup_idempotency(db, key, route, _hash_body(payload))
    if cached is not None:
        return TechnicianVisitDetail.model_validate(cached["body"])
    result = VisitService(db).submit_findings(user, visit_id, body)
    store_idempotency(
        db, key, route, 200, result.model_dump(mode="json"), user.id, _hash_body(payload)
    )
    db.commit()
    return result


@router.post("/visits/{visit_id}/parts", response_model=PartsResponse)
def save_parts(
    visit_id: str,
    body: PartsRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_role("technician"))],
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> PartsResponse:
    key = _require_key(idempotency_key)
    route = f"POST /v1/technician/visits/{visit_id}/parts"
    payload = body.model_dump(mode="json")
    cached = lookup_idempotency(db, key, route, _hash_body(payload))
    if cached is not None:
        return PartsResponse.model_validate(cached["body"])
    result = VisitService(db).save_parts(user, visit_id, body, key)
    store_idempotency(
        db, key, route, 200, result.model_dump(mode="json"), user.id, _hash_body(payload)
    )
    db.commit()
    return result


@router.post("/visits/{visit_id}/labour", response_model=LabourResponse)
def save_labour(
    visit_id: str,
    body: LabourRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_role("technician"))],
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> LabourResponse:
    key = _require_key(idempotency_key)
    route = f"POST /v1/technician/visits/{visit_id}/labour"
    payload = body.model_dump(mode="json")
    cached = lookup_idempotency(db, key, route, _hash_body(payload))
    if cached is not None:
        return LabourResponse.model_validate(cached["body"])
    result = VisitService(db).save_labour(user, visit_id, body, key)
    store_idempotency(
        db, key, route, 200, result.model_dump(mode="json"), user.id, _hash_body(payload)
    )
    db.commit()
    return result


@router.post("/visits/{visit_id}/qc", response_model=TechnicianVisitDetail)
def submit_qc(
    visit_id: str,
    body: QcRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_role("technician"))],
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> TechnicianVisitDetail:
    key = _require_key(idempotency_key)
    route = f"POST /v1/technician/visits/{visit_id}/qc"
    payload = body.model_dump(mode="json")
    cached = lookup_idempotency(db, key, route, _hash_body(payload))
    if cached is not None:
        return TechnicianVisitDetail.model_validate(cached["body"])
    result = VisitService(db).submit_qc(user, visit_id, body, key)
    store_idempotency(
        db, key, route, 200, result.model_dump(mode="json"), user.id, _hash_body(payload)
    )
    db.commit()
    return result


@router.post("/visits/{visit_id}/complete", response_model=TechnicianVisitDetail)
def complete_visit(
    visit_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_role("technician"))],
    body: CompleteVisitBody | None = None,
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> TechnicianVisitDetail:
    key = _require_key(idempotency_key)
    route = f"POST /v1/technician/visits/{visit_id}/complete"
    payload = body.model_dump(mode="json") if body and body.odometer_km is not None else {}
    cached = lookup_idempotency(db, key, route, _hash_body(payload))
    if cached is not None:
        return TechnicianVisitDetail.model_validate(cached["body"])
    result = VisitService(db).complete(user, visit_id, body)
    store_idempotency(
        db, key, route, 200, result.model_dump(mode="json"), user.id, _hash_body(payload)
    )
    db.commit()
    return result


@router.post("/visits/{visit_id}/exception", response_model=TechnicianVisitDetail)
def raise_exception(
    visit_id: str,
    body: ExceptionRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_role("technician"))],
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> TechnicianVisitDetail:
    key = _require_key(idempotency_key)
    route = f"POST /v1/technician/visits/{visit_id}/exception"
    payload = body.model_dump(mode="json")
    cached = lookup_idempotency(db, key, route, _hash_body(payload))
    if cached is not None:
        return TechnicianVisitDetail.model_validate(cached["body"])
    result = VisitService(db).raise_exception(user, visit_id, body)
    store_idempotency(
        db, key, route, 200, result.model_dump(mode="json"), user.id, _hash_body(payload)
    )
    db.commit()
    return result


@router.post("/visits/{visit_id}/scope-progress", response_model=TechnicianVisitDetail)
def scope_progress(
    visit_id: str,
    body: ScopeProgressRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_role("technician"))],
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> TechnicianVisitDetail:
    key = _require_key(idempotency_key)
    route = f"POST /v1/technician/visits/{visit_id}/scope-progress"
    payload = body.model_dump(mode="json")
    cached = lookup_idempotency(db, key, route, _hash_body(payload))
    if cached is not None:
        return TechnicianVisitDetail.model_validate(cached["body"])
    result = VisitService(db).update_scope_progress(user, visit_id, body)
    store_idempotency(
        db, key, route, 200, result.model_dump(mode="json"), user.id, _hash_body(payload)
    )
    db.commit()
    return result


@router.post("/location-pings", response_model=LocationPingAccepted, status_code=202)
def location_pings(
    body: LocationPingRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_role("technician"))],
) -> LocationPingAccepted:
    VisitService(db).location_ping(user, body)
    db.commit()
    return LocationPingAccepted()
