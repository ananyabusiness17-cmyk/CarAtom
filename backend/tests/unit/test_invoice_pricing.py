from app.modules.invoices.pricing import round_tax


def test_round_tax_nearest_rupee() -> None:
    subtotal, tax, total = round_tax(844900)
    assert subtotal == 844900
    assert total == 997000
    assert tax == 152100
    assert subtotal + tax == total
