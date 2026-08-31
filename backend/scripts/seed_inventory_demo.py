"""Idempotent Phase 09 inventory demo seed."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.session import SessionLocal
from app.modules.inventory.seed import seed_inventory_demo


def main() -> None:
    db = SessionLocal()
    try:
        seed_inventory_demo(db)
        print("Seeded Phase 09 inventory SKUs (cabin filter, R134a, condenser, PAG oil).")
    finally:
        db.close()


if __name__ == "__main__":
    main()
