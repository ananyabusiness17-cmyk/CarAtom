"""Seed inspection-and-repair offering. Safe to re-run."""

from app.db.session import SessionLocal
from app.modules.catalog.seed import seed_catalog


def main() -> None:
    db = SessionLocal()
    try:
        seed_catalog(db)
        print("inspection-and-repair offering seeded")
    finally:
        db.close()


if __name__ == "__main__":
    main()
