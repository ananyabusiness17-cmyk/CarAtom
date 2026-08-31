KNOWN_CLIENT_SURFACES = frozenset({"admin_mobile", "admin_web"})


def parse_client_surface(raw: str | None) -> str | None:
    if not raw:
        return None
    value = raw.strip().lower()
    return value if value in KNOWN_CLIENT_SURFACES else None


def clamp_page_limit(limit: int | None, *, surface: str | None) -> int:
    default = 20 if surface == "admin_mobile" else 50
    value = default if limit is None else int(limit)
    return max(1, min(value, 100))
