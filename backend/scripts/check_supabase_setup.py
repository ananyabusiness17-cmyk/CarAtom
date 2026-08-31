"""Read-only check of remaining Supabase setup. Never prints secrets."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dotenv import dotenv_values
import httpx
from sqlalchemy import text

from app.config import settings
from app.db.session import engine


def main() -> None:
    env_path = Path(__file__).resolve().parents[1] / ".env"
    values = dotenv_values(env_path)
    token = (values.get("SUPABASE_ACCESS_TOKEN") or "").strip()
    ref = (values.get("SUPABASE_PROJECT_REF") or "ezuwpspwzqxfxzjmipyn").strip()
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    with httpx.Client(timeout=30.0) as client:
        auth = client.get(f"https://api.supabase.com/v1/projects/{ref}/config/auth", headers=headers)
        if auth.status_code >= 400:
            raise SystemExit(f"auth config HTTP {auth.status_code}")
        payload = auth.json()
        sid = payload.get("sms_twilio_account_sid") or payload.get("SMS_TWILIO_ACCOUNT_SID") or ""
        print(f"phone_enabled={payload.get('external_phone_enabled')}")
        print(f"sms_provider={payload.get('sms_provider')}")
        print(f"twilio_sid_configured={bool(str(sid).strip())}")
        print(f"site_url={payload.get('site_url')}")
        allow = payload.get("uri_allow_list") or ""
        print(f"redirects={len([p for p in str(allow).split(',') if p.strip()])}")

        storage_headers = {
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "apikey": settings.supabase_service_role_key,
        }
        buckets = client.get(f"{settings.supabase_url.rstrip('/')}/storage/v1/bucket", headers=storage_headers)
        if buckets.status_code >= 400:
            raise SystemExit(f"storage list HTTP {buckets.status_code}")
        for item in buckets.json():
            name = item.get("name") or item.get("id")
            if name == settings.supabase_storage_bucket_evidence:
                print(f"bucket={name} public={item.get('public')}")
                break
        else:
            print("bucket=MISSING")

    with engine.connect() as conn:
        version = conn.execute(text("SELECT version_num FROM alembic_version")).scalar()
        offerings = conn.execute(text("SELECT count(*) FROM service_offerings")).scalar()
        techs = conn.execute(text("SELECT count(*) FROM technicians")).scalar()
        print(f"alembic={version}")
        print(f"service_offerings={offerings}")
        print(f"technicians={techs}")


if __name__ == "__main__":
    main()
