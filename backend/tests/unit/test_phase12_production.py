from datetime import UTC, datetime, timedelta
from uuid import uuid4

from sqlalchemy import select

from app.config import Settings
from app.core.rate_limit import match_rule
from app.modules.invoices.pdf_renderer import gst_footer_line, render_invoice_pdf
from app.worker.jobs.retention_purge import purge_stale
from tests.conftest import TestingSessionLocal


def _pdf(**overrides):
    kwargs = dict(
        invoice_number="INV-1",
        issued_at=datetime.now(UTC),
        public_ref="JC-1",
        customer_name="Rajesh",
        phone_masked="+91******3210",
        address_lines=["Bengaluru"],
        vehicle_line="Honda City",
        registration="KA01AB1234",
        lines=[
            {
                "kind": "LABOUR",
                "label": "Service",
                "quantity": 1,
                "unit_price_minor": 10000,
                "amount_minor": 10000,
            }
        ],
        subtotal_minor=10000,
        tax_minor=1800,
        total_minor=11800,
        paid_minor=0,
        balance_minor=11800,
    )
    kwargs.update(overrides)
    return render_invoice_pdf(**kwargs)


def test_invoice_pdf_includes_gstin_and_sac() -> None:
    line = gst_footer_line(gstin="29ABCDE1234F1Z5", sac="998729")
    assert "[TBD Phase 12]" not in line
    assert "29ABCDE1234F1Z5" in line
    assert "SAC: 998729" in line
    pdf = _pdf(gstin="29ABCDE1234F1Z5", legal_name="CARATOM SERVICES LLP", sac="998729")
    assert pdf.startswith(b"%PDF")
    assert len(pdf) > 200


def test_invoice_pdf_pending_gstin_when_unset() -> None:
    line = gst_footer_line(gstin="", sac="")
    assert "pending registration" in line
    pdf = _pdf(gstin="", legal_name="", sac="")
    assert pdf.startswith(b"%PDF")


def test_production_cors_replaces_localhost() -> None:
    settings = Settings(
        env="production",
        cors_origins=[
            "http://localhost:3000",
            "http://localhost:8081",
            "http://localhost:8082",
            "http://localhost:8083",
        ],
    )
    assert settings.cors_origins == ["https://admin.caratom.in"]


def test_production_cors_keeps_explicit_allowlist() -> None:
    settings = Settings(env="production", cors_origins=["https://admin.caratom.in"])
    assert settings.cors_origins == ["https://admin.caratom.in"]


def test_dev_cors_keeps_localhost() -> None:
    settings = Settings(env="development")
    assert any("localhost" in origin for origin in settings.cors_origins)


def test_rate_limit_production_table() -> None:
    assert match_rule("GET", "/v1/catalog/home") == (120, 60)
    assert match_rule("POST", "/v1/payments/webhook/razorpay") == (1000, 60)
    assert match_rule("GET", "/v1/admin/inventory") == (300, 60)
    assert match_rule("POST", "/v1/admin/job-cards/abc") == (30, 3600)


def test_retention_purges_old_location_pings() -> None:
    from app.db.models import Profile
    from app.modules.technicians.models import Technician
    from app.modules.visits.models import TechnicianLocationPing

    db = TestingSessionLocal()
    try:
        profile = Profile(id=str(uuid4()), role="technician", is_active=True, phone="+919800000099")
        db.add(profile)
        db.flush()
        tech = Technician(id=str(uuid4()), profile_id=profile.id, display_name="Tech")
        db.add(tech)
        db.flush()
        old = TechnicianLocationPing(
            technician_id=tech.id,
            lat=12.9,
            lng=77.6,
            recorded_at=datetime.now(UTC) - timedelta(days=91),
        )
        recent = TechnicianLocationPing(
            technician_id=tech.id,
            lat=12.9,
            lng=77.6,
            recorded_at=datetime.now(UTC) - timedelta(days=1),
        )
        db.add_all([old, recent])
        db.commit()
        counts = purge_stale(db, datetime.now(UTC))
        db.commit()
        assert counts["pings"] >= 1
        remaining = list(db.scalars(select(TechnicianLocationPing)).all())
        assert len(remaining) == 1
    finally:
        db.close()


def test_razorpay_create_order_fails_closed_in_production(monkeypatch) -> None:
    from app.common.errors import DomainProblem
    from app.config import settings
    from app.modules.payments.razorpay_client import RazorpayClient, public_razorpay_key_id

    monkeypatch.setattr(settings, "env", "production")
    monkeypatch.setattr(settings, "razorpay_key_id", "")
    monkeypatch.setattr(settings, "razorpay_key_secret", "")
    try:
        RazorpayClient().create_order(amount_minor=100, currency="INR", receipt="r1")
        raise AssertionError("expected DomainProblem")
    except DomainProblem as exc:
        assert exc.status == 503
        assert exc.code == "PAYMENTS_NOT_CONFIGURED"
    assert public_razorpay_key_id() == ""


def test_razorpay_create_order_fakes_in_development(monkeypatch) -> None:
    from app.config import settings
    from app.modules.payments.razorpay_client import RazorpayClient, public_razorpay_key_id

    monkeypatch.setattr(settings, "env", "development")
    monkeypatch.setattr(settings, "razorpay_key_id", "")
    monkeypatch.setattr(settings, "razorpay_key_secret", "")
    order = RazorpayClient().create_order(amount_minor=100, currency="INR", receipt="r1")
    assert order.id.startswith("order_")
    assert public_razorpay_key_id() == "rzp_test_dev"


def test_storage_fails_closed_in_production(monkeypatch) -> None:
    from app.config import settings
    from app.modules.media.storage import StorageSignError, get_storage

    monkeypatch.setattr(settings, "env", "production")
    monkeypatch.setattr(settings, "supabase_url", "")
    monkeypatch.setattr(settings, "supabase_service_role_key", "")
    try:
        get_storage()
        raise AssertionError("expected StorageSignError")
    except StorageSignError:
        pass

