from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.common.errors import DomainProblem
from app.config import settings
from app.core.deps import CurrentUser
from app.modules.job_cards.models import JobCard
from app.modules.job_cards.service import JobCardService
from app.modules.media.models import MediaAsset
from app.modules.media.storage import StorageAdapter, StorageSignError, get_storage
from app.modules.visits.models import Visit
from app.modules.visits.repository import VisitRepository
from app.modules.visits.schemas import SignedUploadRequest, SignedUploadResponse

ALLOWED_CONTENT = {"image/jpeg", "image/png", "image/webp", "image/heic"}


class MediaService:
    def __init__(self, db: Session, storage: StorageAdapter | None = None) -> None:
        self.db = db
        self.storage = storage or get_storage()
        self.visits = VisitRepository(db)

    def _assert_visit_upload_allowed(self, user: CurrentUser, visit: Visit) -> None:
        if user.role == "admin":
            return
        if user.role == "technician":
            tech = self.visits.technician_by_profile(user.id)
            if tech is None:
                raise DomainProblem(403, "FORBIDDEN", "Not assigned as an active technician.")
            assignment = self.visits.get_current_assignment(visit.id)
            if assignment is None or assignment.technician_id != tech.id:
                raise DomainProblem(403, "FORBIDDEN", "Not assigned to this visit.")
            return
        job = self.db.get(JobCard, visit.job_card_id)
        if job is None:
            raise DomainProblem(404, "VISIT_NOT_FOUND", "Visit not found.")
        if job.profile_id is not None and job.profile_id != user.id:
            raise DomainProblem(403, "FORBIDDEN", "Not allowed to attach media to this visit.")

    def create_signed_upload(
        self, user: CurrentUser, body: SignedUploadRequest
    ) -> SignedUploadResponse:
        if body.content_type.lower() not in ALLOWED_CONTENT:
            raise DomainProblem(
                422, "INVALID_CONTENT_TYPE", "Only JPEG, PNG, WebP, or HEIC images."
            )
        if body.byte_size > settings.max_evidence_bytes:
            raise DomainProblem(422, "UPLOAD_TOO_LARGE", "Evidence file exceeds the size limit.")
        visit = None
        job_card_id = body.job_card_id
        if body.job_card_id and user.role != "technician":
            JobCardService(self.db).get_accessible(body.job_card_id, user)
        if body.visit_id:
            visit = self.visits.get_visit(body.visit_id)
            if visit is None:
                raise DomainProblem(404, "VISIT_NOT_FOUND", "Visit not found.")
            self._assert_visit_upload_allowed(user, visit)
            pending = self.db.scalar(
                select(func.count())
                .select_from(MediaAsset)
                .where(MediaAsset.visit_id == visit.id, MediaAsset.status == "pending")
            )
            if (pending or 0) >= settings.max_pending_evidence_per_visit:
                raise DomainProblem(
                    422, "UPLOAD_QUOTA_EXCEEDED", "Too many pending evidence uploads."
                )
            folder = visit.id
        elif user.role == "customer":
            pending = self.db.scalar(
                select(func.count())
                .select_from(MediaAsset)
                .where(MediaAsset.uploader_profile_id == user.id, MediaAsset.status == "pending")
            )
            if (pending or 0) >= 6:
                raise DomainProblem(422, "UPLOAD_QUOTA_EXCEEDED", "Too many pending photo uploads.")
            folder = f"customer/{user.id}"
        else:
            raise DomainProblem(422, "VISIT_NOT_FOUND", "Visit is required for this upload.")
        asset_id = str(uuid4())
        safe_name = body.filename.replace("/", "_").replace("\\", "_")
        storage_path = f"{folder}/{asset_id}/{safe_name}"
        try:
            upload_url, headers, expires_at = self.storage.create_signed_upload(
                storage_path, body.content_type, settings.signed_upload_ttl_seconds
            )
        except StorageSignError as exc:
            raise DomainProblem(503, "STORAGE_UNAVAILABLE", str(exc)) from exc
        for key, value in headers.items():
            combined = f"{key}:{value}".lower()
            if "authorization" in key.lower() or "bearer " in combined:
                raise DomainProblem(500, "INTERNAL", "Unsafe upload headers.")
        self.db.add(
            MediaAsset(
                id=asset_id,
                visit_id=visit.id if visit is not None else None,
                job_card_id=job_card_id or (visit.job_card_id if visit is not None else None),
                uploader_profile_id=user.id,
                storage_path=storage_path,
                content_type=body.content_type,
                byte_size=body.byte_size,
                sha256=body.sha256,
                status="pending",
            )
        )
        self.db.flush()
        return SignedUploadResponse(
            asset_id=asset_id,
            upload_url=upload_url,
            upload_headers=headers,
            expires_at=expires_at,
        )

    def confirm(self, user: CurrentUser, asset_id: str) -> MediaAsset:
        asset = self.db.get(MediaAsset, asset_id)
        if asset is None:
            raise DomainProblem(404, "NOT_FOUND", "Media asset not found.")
        if user.role != "admin" and asset.uploader_profile_id != user.id:
            raise DomainProblem(403, "FORBIDDEN", "Not the uploader of this asset.")
        asset.status = "ready"
        self.db.flush()
        return asset
