from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_user
from app.db.session import get_db
from app.modules.addresses.schemas import AddressIn, AddressListResponse, AddressOut
from app.modules.addresses.service import AddressService

router = APIRouter()


@router.get("/me/addresses", response_model=AddressListResponse)
def list_addresses(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_user)],
) -> AddressListResponse:
    return AddressListResponse(items=AddressService(db).list_for(user.id))


@router.post("/me/addresses", response_model=AddressOut, status_code=201)
def create_address(
    body: AddressIn,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_user)],
) -> AddressOut:
    return AddressService(db).create(user.id, body)


@router.patch("/me/addresses/{address_id}", response_model=AddressOut)
def patch_address(
    address_id: str,
    body: AddressIn,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_user)],
) -> AddressOut:
    return AddressService(db).patch(user.id, address_id, body)
