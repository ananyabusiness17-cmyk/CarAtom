"""Idempotent Koramangala launch catalog seed."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.session import SessionLocal
from app.modules.catalog.seed import seed_catalog


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--env", default="development")
    parser.parse_args()
    db = SessionLocal()
    try:
        seed_catalog(db)
        print("Seeded Koramangala catalog.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
