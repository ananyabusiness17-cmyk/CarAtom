"""Create or force-private the evidence/invoice storage bucket. Does not print secrets."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import httpx

from app.config import settings


def main() -> None:
    base = settings.supabase_url.rstrip("/")
    key = settings.supabase_service_role_key
    name = settings.supabase_storage_bucket_evidence
    if not base or not key:
        raise SystemExit("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.")
    if "your-project" in base:
        raise SystemExit("SUPABASE_URL is still a placeholder.")

    headers = {
        "Authorization": f"Bearer {key}",
        "apikey": key,
        "Content-Type": "application/json",
    }
    body = {
        "id": name,
        "name": name,
        "public": False,
        "file_size_limit": settings.max_evidence_bytes,
    }

    with httpx.Client(timeout=30.0) as client:
        listed = client.get(f"{base}/storage/v1/bucket", headers=headers)
        if listed.status_code >= 400:
            raise SystemExit(f"Could not list buckets (HTTP {listed.status_code}).")
        buckets = listed.json()
        ids = {item.get("id") or item.get("name") for item in buckets}
        if name not in ids:
            created = client.post(f"{base}/storage/v1/bucket", headers=headers, json=body)
            if created.status_code not in (200, 201):
                raise SystemExit(f"Could not create bucket (HTTP {created.status_code}).")
            print(f"Created private storage bucket {name}.")
        else:
            updated = client.put(f"{base}/storage/v1/bucket/{name}", headers=headers, json={"public": False})
            if updated.status_code >= 400:
                updated = client.post(
                    f"{base}/storage/v1/bucket",
                    headers=headers,
                    json={**body, "id": name},
                )
            if updated.status_code >= 400:
                raise SystemExit(f"Could not mark bucket private (HTTP {updated.status_code}).")
            print(f"Ensured storage bucket {name} is private.")

        if settings.invoice_pdf_bucket != name:
            inv = settings.invoice_pdf_bucket
            if inv not in ids:
                created = client.post(
                    f"{base}/storage/v1/bucket",
                    headers=headers,
                    json={
                        "id": inv,
                        "name": inv,
                        "public": False,
                        "file_size_limit": settings.max_evidence_bytes,
                    },
                )
                if created.status_code not in (200, 201):
                    raise SystemExit(f"Could not create invoice bucket (HTTP {created.status_code}).")
                print(f"Created private storage bucket {inv}.")
            else:
                print(f"Invoice bucket {inv} already exists.")


if __name__ == "__main__":
    main()
