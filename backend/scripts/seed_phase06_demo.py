"""Idempotent Phase 06 technician + three-visit demo seed."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.session import SessionLocal
from app.modules.visits.demo import seed_phase06


def main() -> None:
    db = SessionLocal()
    try:
        tech = seed_phase06(db)
        print(f"Seeded Phase 06 technician {tech.display_name} ({tech.id}) and demo visits.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
