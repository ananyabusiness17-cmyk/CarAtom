from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_role
from app.db.session import get_db
from app.modules.media.service import MediaService
from app.modules.visits.schemas import (
    MediaConfirmResponse,
    SignedUploadRequest,
    SignedUploadResponse,
)

router = APIRouter()


@router.post("/signed-upload", response_model=SignedUploadResponse)
def create_signed_upload(
    body: SignedUploadRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_role("technician", "admin", "customer"))],
) -> SignedUploadResponse:
    result = MediaService(db).create_signed_upload(user, body)
    db.commit()
    return result


@router.post("/{asset_id}/confirm", response_model=MediaConfirmResponse)
def confirm_upload(
    asset_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(require_role("technician", "admin", "customer"))],
) -> MediaConfirmResponse:
    asset = MediaService(db).confirm(user, asset_id)
    db.commit()
    return MediaConfirmResponse(asset_id=asset.id, status=asset.status)
