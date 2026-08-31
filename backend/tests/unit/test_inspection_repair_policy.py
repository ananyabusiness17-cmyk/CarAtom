from app.modules.inspection_repair.policy import parts_advance_amount


def test_parts_advance_floors_percent() -> None:
    assert parts_advance_amount(800000, 60) == 480000
    assert parts_advance_amount(100, 60) == 60
    assert parts_advance_amount(0, 60) == 0
    assert parts_advance_amount(800000, 0) == 0
