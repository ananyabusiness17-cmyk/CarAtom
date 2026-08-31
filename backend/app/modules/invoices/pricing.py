"""GST fixture rounding: 18% then nearest rupee (100 minor units)."""

GST_BPS = 1800


def round_tax(subtotal_minor: int, tax_rate_bps: int = GST_BPS) -> tuple[int, int, int]:
    if subtotal_minor <= 0:
        return 0, 0, 0
    tax = (subtotal_minor * tax_rate_bps + 5_000) // 10_000
    total = subtotal_minor + tax
    rounded_total = int(round(total / 100) * 100)
    rounded_tax = max(0, rounded_total - subtotal_minor)
    return subtotal_minor, rounded_tax, rounded_total
