from app.modules.advisor.repository import ADVISOR_TRANSITIONS


def test_open_to_contacting_allowed() -> None:
    assert "CONTACTING" in ADVISOR_TRANSITIONS["OPEN"]
    assert "CONFIRMED" in ADVISOR_TRANSITIONS["CUSTOMER_CONFIRMATION_DUE"]


def test_confirmed_is_terminal() -> None:
    assert ADVISOR_TRANSITIONS["CONFIRMED"] == set()
