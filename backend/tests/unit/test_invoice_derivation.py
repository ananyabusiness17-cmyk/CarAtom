from decimal import Decimal
from types import SimpleNamespace

from app.modules.invoices.service import derive_invoice_lines


def test_invoice_derived_from_fitted_parts_not_estimate_only() -> None:
    estimate = SimpleNamespace(
        line_items=[
            SimpleNamespace(
                kind="SERVICE",
                label="General servicing + health report",
                amount_minor=299900,
                is_included=False,
            ),
            SimpleNamespace(
                kind="PART", label="AC gas refill", amount_minor=180000, is_included=False
            ),
            SimpleNamespace(
                kind="PART", label="Brake pads (pair)", amount_minor=320000, is_included=False
            ),
            SimpleNamespace(
                kind="PART", label="Unused cabin filter", amount_minor=50000, is_included=False
            ),
            SimpleNamespace(
                kind="LABOUR", label="Brake fluid flush", amount_minor=45000, is_included=False
            ),
        ]
    )
    parts = [
        SimpleNamespace(
            label="AC gas refill",
            sku_code="AC-GAS",
            quantity=Decimal("1"),
            visit_id="v1",
            readiness_status="FITTED",
        ),
        SimpleNamespace(
            label="Brake pads (pair)",
            sku_code="BP",
            quantity=Decimal("1"),
            visit_id="v1",
            readiness_status="FITTED",
        ),
    ]
    labour = [SimpleNamespace(description="Brake fluid flush")]
    booking = SimpleNamespace(snapshot=None)
    lines = derive_invoice_lines(estimate, parts, labour, booking)
    labels = {row["label"] for row in lines}
    assert "General servicing + health report" in labels
    assert "Brake pads (pair)" in labels
    assert "AC gas refill" in labels
    assert "Brake fluid flush" in labels
    assert "Unused cabin filter" not in labels
