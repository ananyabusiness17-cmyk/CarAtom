import pytest

from app.core.refs import next_job_card_ref, next_sequence_value
from tests.conftest import TestingSessionLocal


def test_unique_job_card_refs() -> None:
    db = TestingSessionLocal()
    try:
        first = next_job_card_ref(db)
        second = next_job_card_ref(db)
        db.commit()
        assert first != second
        assert first.startswith("JC-")
        assert second.startswith("JC-")
    finally:
        db.close()


def test_unknown_sequence_rejected() -> None:
    db = TestingSessionLocal()
    try:
        with pytest.raises(ValueError, match="Unknown sequence"):
            next_sequence_value(db, "not_a_real_seq")
    finally:
        db.close()
