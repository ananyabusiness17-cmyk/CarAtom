"""Apply Auth URL allowlist (and phone if the API exposes it). Never prints tokens."""

from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dotenv import dotenv_values
import httpx

from app.config import settings

REDIRECTS = [
    "http://localhost:3000/**",
    "http://127.0.0.1:3000/**",
    "http://localhost:8081/**",
    "http://localhost:8082/**",
    "http://localhost:8083/**",
    "exp://**",
    "caratom://**",
    "caratom-customer://**",
    "caratom-technician://**",
    "caratom-admin-mobile://**",
    "https://staging.caratom.app/**",
    "https://admin.caratom.in/**",
]
SITE_URL = "http://localhost:3000"


def _token_and_ref() -> tuple[str, str]:
    env_path = Path(__file__).resolve().parents[1] / ".env"
    values = dotenv_values(env_path)
    token = (values.get("SUPABASE_ACCESS_TOKEN") or os.environ.get("SUPABASE_ACCESS_TOKEN") or "").strip()
    ref = (
        values.get("SUPABASE_PROJECT_REF")
        or os.environ.get("SUPABASE_PROJECT_REF")
        or ""
    ).strip()
    if not ref and settings.supabase_url:
        host = settings.supabase_url.replace("https://", "").replace("http://", "").split("/")[0]
        ref = host.split(".")[0]
    if not token:
        raise SystemExit("SUPABASE_ACCESS_TOKEN missing in backend/.env")
    if not token.startswith("sbp_"):
        raise SystemExit("SUPABASE_ACCESS_TOKEN does not look like a management token.")
    if not ref:
        raise SystemExit("SUPABASE_PROJECT_REF missing.")
    return token, ref


def _headers(token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }


def _summarize_auth(payload: dict) -> None:
    keys = {k.lower(): k for k in payload}
    def pick(*names: str):
        for name in names:
            if name in payload:
                return payload[name]
            lower = name.lower()
            if lower in keys:
                return payload[keys[lower]]
        return None

    site = pick("site_url", "SITE_URL")
    allow = pick("uri_allow_list", "URI_ALLOW_LIST")
    phone = pick("external_phone_enabled", "EXTERNAL_PHONE_ENABLED")
    sms = pick("sms_provider", "SMS_PROVIDER")
    print(f"site_url={site}")
    allow_s = allow if isinstance(allow, str) else str(allow)
    print(f"uri_allow_list_count={len([p for p in allow_s.split(',') if p.strip()])}")
    print(f"phone_enabled={phone}")
    print(f"sms_provider={sms}")


def main() -> None:
    token, ref = _token_and_ref()
    base = f"https://api.supabase.com/v1/projects/{ref}/config/auth"
    with httpx.Client(timeout=30.0) as client:
        got = client.get(base, headers=_headers(token))
        if got.status_code == 401:
            raise SystemExit("Management token rejected (401). Rotate it in the dashboard.")
        if got.status_code >= 400:
            raise SystemExit(f"GET auth config failed HTTP {got.status_code}")
        current = got.json()
        print("Current auth config:")
        _summarize_auth(current)

        patch: dict = {}
        # Newer API uses snake_case; older uses SCREAMING_SNAKE. Send both if needed after inspect.
        if "site_url" in current or "SITE_URL" in current:
            if "site_url" in current:
                patch["site_url"] = SITE_URL
                patch["uri_allow_list"] = ",".join(REDIRECTS)
            else:
                patch["SITE_URL"] = SITE_URL
                patch["URI_ALLOW_LIST"] = ",".join(REDIRECTS)
        else:
            patch["site_url"] = SITE_URL
            patch["uri_allow_list"] = ",".join(REDIRECTS)
            patch["SITE_URL"] = SITE_URL
            patch["URI_ALLOW_LIST"] = ",".join(REDIRECTS)

        phone_key = None
        for candidate in ("external_phone_enabled", "EXTERNAL_PHONE_ENABLED"):
            if candidate in current:
                phone_key = candidate
                break
        if phone_key:
            patch[phone_key] = True
        else:
            patch["external_phone_enabled"] = True

        updated = client.patch(base, headers=_headers(token), json=patch)
        if updated.status_code >= 400:
            # Retry with only URL fields if phone field is rejected.
            url_only = {k: v for k, v in patch.items() if "phone" not in k.lower()}
            retry = client.patch(base, headers=_headers(token), json=url_only)
            if retry.status_code >= 400:
                raise SystemExit(f"PATCH auth config failed HTTP {updated.status_code} then {retry.status_code}")
            print("Patched redirect URLs. Phone field was not accepted by this API.")
            _summarize_auth(retry.json() if retry.content else {})
            return
        print("Patched auth config.")
        _summarize_auth(updated.json() if updated.content else {})

        verify = client.get(base, headers=_headers(token))
        if verify.status_code < 400:
            print("Verified auth config:")
            _summarize_auth(verify.json())


if __name__ == "__main__":
    main()
