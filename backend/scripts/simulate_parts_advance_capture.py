"""Test helper: mark a parts-advance payment captured."""

import argparse

from app.db.session import SessionLocal
from app.modules.payments.models import Payment
from app.modules.payments.parts_advance import PartsAdvanceService


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--payment-id", required=True)
    args = parser.parse_args()
    db = SessionLocal()
    try:
        payment = db.get(Payment, args.payment_id)
        if payment is None:
            raise SystemExit(f"payment {args.payment_id} not found")
        PartsAdvanceService(db).capture(payment, provider_payment_id=f"pay_sim_{payment.id[:8]}")
        db.commit()
        print(payment.status)
    finally:
        db.close()


if __name__ == "__main__":
    main()
