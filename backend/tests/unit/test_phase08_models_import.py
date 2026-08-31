from app.db.models import Base
from app.modules.invoices.models import Invoice
from app.modules.notifications.models import Notification
from app.modules.payments.models import Payment, Refund
from app.modules.reviews.models import Review


def test_phase08_models_registered() -> None:
    names = set(Base.metadata.tables)
    for table in (
        "invoices",
        "invoice_line_items",
        "payments",
        "payment_events",
        "refunds",
        "reviews",
        "notifications",
    ):
        assert table in names
    assert Invoice.__tablename__ == "invoices"
    assert Review.__tablename__ == "reviews"
    assert Notification.__tablename__ == "notifications"
    assert Payment.__tablename__ == "payments"
    assert Refund.__tablename__ == "refunds"
