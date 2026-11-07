from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.common.errors import DomainProblem
from app.config import settings
from app.core.auth import encode_dev_local_token
from app.db.session import get_db
from app.modules.visits.demo import IMRAN_PHONE, ensure_imran

router = APIRouter()


class LocalLoginRequest(BaseModel):
    phone: str = Field(min_length=10, max_length=16)
    code: str = Field(min_length=4, max_length=8)


class LocalLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    phone: str
    role: str


def _require_development() -> None:
    if settings.env.lower() == "development":
        return
    raise DomainProblem(404, "NOT_FOUND", "Not found.")


@router.post("/local-login", response_model=LocalLoginResponse)
def local_login(
    body: LocalLoginRequest,
    db: Annotated[Session, Depends(get_db)],
) -> LocalLoginResponse:
    _require_development()
    phone = body.phone.strip()
    if phone != IMRAN_PHONE:
        raise DomainProblem(401, "INVALID_OTP", "Local login is only for the demo technician.")
    if body.code.strip() != settings.dev_local_otp:
        raise DomainProblem(401, "INVALID_OTP", "That code is not valid.")
    tech = ensure_imran(db)
    db.commit()
    token = encode_dev_local_token(sub=tech.profile_id, phone=IMRAN_PHONE)
    return LocalLoginResponse(access_token=token, user_id=tech.profile_id, phone=IMRAN_PHONE, role="technician")
