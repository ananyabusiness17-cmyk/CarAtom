from __future__ import annotations

import re
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml

TEMPLATES_DIR = Path(__file__).resolve().parent / "templates" / "v1"
_PLACEHOLDER = re.compile(r"\{\{\s*([a-zA-Z0-9_]+)\s*\}\}")


def _fill(text: str, context: dict[str, Any]) -> str:
    def repl(match: re.Match[str]) -> str:
        key = match.group(1)
        value = context.get(key)
        return "" if value is None else str(value)

    return _PLACEHOLDER.sub(repl, text)


@lru_cache(maxsize=32)
def load_template(intent: str) -> dict[str, Any]:
    path = TEMPLATES_DIR / f"{intent}.yaml"
    if not path.exists():
        return {
            "version": 1,
            "intent": intent,
            "channels": {
                "push": {"title": "CARATOM", "body": "You have an update."},
                "sms": {"body": "CARATOM: You have an update. Open: {{deep_link_short}}"},
            },
            "deep_link_template": "caratom://notifications",
        }
    return yaml.safe_load(path.read_text(encoding="utf-8")) or {}


def render_template(intent: str, context: dict[str, Any]) -> dict[str, Any]:
    raw = load_template(intent)
    version = int(raw.get("version") or 1)
    channels_in = raw.get("channels") or {}
    rendered_channels: dict[str, dict[str, Any]] = {}
    for channel, spec in channels_in.items():
        if not isinstance(spec, dict):
            continue
        rendered_channels[channel] = {
            key: _fill(value, context) if isinstance(value, str) else value
            for key, value in spec.items()
        }
        params = spec.get("params")
        if isinstance(params, list):
            rendered_channels[channel]["params"] = {
                name: str(context.get(name, "")) for name in params
            }
    deep_link = _fill(str(raw.get("deep_link_template") or "caratom://notifications"), context)
    return {
        "version": version,
        "intent": intent,
        "channels": rendered_channels,
        "deep_link_path": deep_link,
        "title": (rendered_channels.get("push") or {}).get("title") or "CARATOM",
        "body": (rendered_channels.get("push") or {}).get("body")
        or (rendered_channels.get("sms") or {}).get("body")
        or "You have an update.",
    }
