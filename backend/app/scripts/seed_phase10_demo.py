"""Idempotent Phase 10 admin-mobile field-ops demo seed.

Run from backend/:

    uv run python -m app.scripts.seed_phase10_demo
"""

from __future__ import annotations

import app.db.models  # noqa: F401 — load Base + phase models before visit seed imports
from app.db.session import SessionLocal
from app.modules.visits.phase10 import seed_phase10


def main() -> None:
    db = SessionLocal()
    try:
        techs = seed_phase10(db)
        names = ", ".join(f"{row.display_name} ({row.id})" for row in techs.values())
        print(f"Seeded Phase 10 demo technicians: {names}")
        print(
            "Jobs: JC-1042 Inspecting/Imran, JC-0991 parts advance/Kavya, JC-1015 unassigned i20."
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
