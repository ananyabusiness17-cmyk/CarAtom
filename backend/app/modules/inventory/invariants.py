from app.common.errors import DomainProblem
from app.modules.inventory.models import LOCATIONS, MOVEMENT_TYPES


def assert_location(code: str) -> str:
    upper = code.upper()
    if upper not in LOCATIONS:
        raise DomainProblem(422, "INVALID_LOCATION", f"Unknown location {code}.")
    return upper


def assert_movement_type(value: str) -> str:
    upper = value.upper()
    if upper not in MOVEMENT_TYPES:
        raise DomainProblem(422, "INVALID_MOVEMENT_TYPE", f"Unknown movement type {value}.")
    return upper


def assert_non_negative(quantity: int) -> None:
    if quantity < 0:
        raise DomainProblem(
            409,
            "INSUFFICIENT_STOCK",
            "Stock cannot go negative.",
        )
