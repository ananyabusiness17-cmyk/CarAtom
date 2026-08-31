from datetime import UTC, datetime, timedelta

import httpx

from app.config import settings

_CLIENT_SAFE_HEADER_KEYS = {"content-type", "x-upsert"}
_FAKE_OBJECTS: dict[str, bytes] = {}


class StorageAdapter:
    def create_signed_upload(
        self, storage_path: str, content_type: str, ttl_seconds: int
    ) -> tuple[str, dict[str, str], datetime]:
        raise NotImplementedError

    def upload_bytes(self, storage_path: str, data: bytes, content_type: str) -> None:
        raise NotImplementedError

    def create_signed_download(self, storage_path: str, ttl_seconds: int) -> str:
        raise NotImplementedError


class FakeStorage(StorageAdapter):
    def create_signed_upload(
        self, storage_path: str, content_type: str, ttl_seconds: int
    ) -> tuple[str, dict[str, str], datetime]:
        expires = datetime.now(UTC) + timedelta(seconds=ttl_seconds)
        url = f"https://example.supabase.co/storage/v1/object/upload/sign/{storage_path}"
        return url, {"Content-Type": content_type}, expires

    def upload_bytes(self, storage_path: str, data: bytes, content_type: str) -> None:
        _FAKE_OBJECTS[storage_path] = data

    def create_signed_download(self, storage_path: str, ttl_seconds: int) -> str:
        return (
            f"https://example.supabase.co/storage/v1/object/sign/"
            f"{storage_path}?ttl={ttl_seconds}"
        )


def _client_headers(content_type: str, extra: dict[str, str] | None = None) -> dict[str, str]:
    headers = {"Content-Type": content_type}
    if extra:
        for key, value in extra.items():
            if key.lower() in _CLIENT_SAFE_HEADER_KEYS:
                headers[key] = value
    return headers


class SupabaseStorage(StorageAdapter):
    def create_signed_upload(
        self, storage_path: str, content_type: str, ttl_seconds: int
    ) -> tuple[str, dict[str, str], datetime]:
        if not settings.supabase_url or not settings.supabase_service_role_key:
            if settings.is_production:
                raise StorageSignError("Storage is not configured.")
            return FakeStorage().create_signed_upload(storage_path, content_type, ttl_seconds)
        expires = datetime.now(UTC) + timedelta(seconds=ttl_seconds)
        bucket = settings.supabase_storage_bucket_evidence
        base = settings.supabase_url.rstrip("/")
        sign_url = f"{base}/storage/v1/object/upload/sign/{bucket}/{storage_path}"
        try:
            response = httpx.post(
                sign_url,
                headers={
                    "Authorization": f"Bearer {settings.supabase_service_role_key}",
                    "apikey": settings.supabase_service_role_key,
                    "Content-Type": "application/json",
                },
                json={"expiresIn": ttl_seconds},
                timeout=15.0,
            )
            response.raise_for_status()
            payload = response.json()
        except (httpx.HTTPError, ValueError, TypeError) as exc:
            raise StorageSignError("Could not mint a signed upload URL.") from exc
        relative = payload.get("url") if isinstance(payload, dict) else None
        if not isinstance(relative, str) or not relative:
            raise StorageSignError("Storage did not return a signed upload URL.")
        upload_url = relative if relative.startswith("http") else f"{base}/storage/v1{relative}"
        return upload_url, _client_headers(content_type), expires

    def upload_bytes(self, storage_path: str, data: bytes, content_type: str) -> None:
        if not settings.supabase_url or not settings.supabase_service_role_key:
            if settings.is_production:
                raise StorageSignError("Storage is not configured.")
            FakeStorage().upload_bytes(storage_path, data, content_type)
            return
        bucket = settings.invoice_pdf_bucket
        base = settings.supabase_url.rstrip("/")
        url = f"{base}/storage/v1/object/{bucket}/{storage_path}"
        try:
            response = httpx.post(
                url,
                headers={
                    "Authorization": f"Bearer {settings.supabase_service_role_key}",
                    "apikey": settings.supabase_service_role_key,
                    "Content-Type": content_type,
                    "x-upsert": "true",
                },
                content=data,
                timeout=30.0,
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise StorageSignError("Could not upload invoice PDF.") from exc

    def create_signed_download(self, storage_path: str, ttl_seconds: int) -> str:
        if not settings.supabase_url or not settings.supabase_service_role_key:
            if settings.is_production:
                raise StorageSignError("Storage is not configured.")
            return FakeStorage().create_signed_download(storage_path, ttl_seconds)
        bucket = settings.invoice_pdf_bucket
        base = settings.supabase_url.rstrip("/")
        sign_url = f"{base}/storage/v1/object/sign/{bucket}/{storage_path}"
        try:
            response = httpx.post(
                sign_url,
                headers={
                    "Authorization": f"Bearer {settings.supabase_service_role_key}",
                    "apikey": settings.supabase_service_role_key,
                    "Content-Type": "application/json",
                },
                json={"expiresIn": ttl_seconds},
                timeout=15.0,
            )
            response.raise_for_status()
            payload = response.json()
        except (httpx.HTTPError, ValueError, TypeError) as exc:
            raise StorageSignError("Could not mint a signed download URL.") from exc
        relative = None
        if isinstance(payload, dict):
            relative = payload.get("signedURL") or payload.get("url")
        if not isinstance(relative, str) or not relative:
            raise StorageSignError("Storage did not return a signed download URL.")
        return relative if relative.startswith("http") else f"{base}/storage/v1{relative}"


class StorageSignError(RuntimeError):
    pass


def get_storage() -> StorageAdapter:
    if settings.is_production:
        if not settings.supabase_url or not settings.supabase_service_role_key:
            raise StorageSignError("Storage is not configured.")
        return SupabaseStorage()
    if settings.env == "development" and not settings.supabase_service_role_key:
        return FakeStorage()
    return SupabaseStorage()
