"""Idempotent Phase 08 invoice / payment / notification demo seed."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.session import SessionLocal
from app.modules.invoices.demo import seed_phase08


def main() -> None:
    db = SessionLocal()
    try:
        seed_phase08(db)
        print("Seeded Phase 08 invoices, JC-1042 unpaid, JC-0991 paid, and 3 notifications.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
