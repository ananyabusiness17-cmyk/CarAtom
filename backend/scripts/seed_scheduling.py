"""Idempotent Koramangala service calendar seed."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import app.db.models  # noqa: F401
from app.db.session import SessionLocal
from app.modules.slots.seed import seed_scheduling


def main() -> None:
    db = SessionLocal()
    try:
        seed_scheduling(db)
        print("Seeded Koramangala scheduling calendar.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
