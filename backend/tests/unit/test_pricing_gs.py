from app.modules.pricing.service import content_hash


def test_hash_is_stable() -> None:
    lines = [
        {
            "label": "General servicing + health report",
            "kind": "SERVICE",
            "amount_minor": 299900,
            "is_included": False,
        },
        {
            "label": "Included fluids check",
            "kind": "INCLUSION",
            "amount_minor": 0,
            "is_included": True,
        },
    ]
    first = content_hash(lines)
    second = content_hash(list(lines))
    assert first == second
    assert first.startswith("sha256:")
