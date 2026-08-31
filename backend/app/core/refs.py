from datetime import datetime

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.time import IST
from app.db.models import IdSequence

_STARTS = {
    "job_card_ref_seq": 1050,
    "booking_ref_seq": 2201,
    "support_ticket_ref_seq": 7001,
    "visit_ref_seq": 1042,
    "invoice_number_seq": 42,
}


def next_sequence_value(db: Session, seq_name: str) -> int:
    if seq_name not in _STARTS:
        raise ValueError(f"Unknown sequence {seq_name}")
    start = _STARTS[seq_name]
    bind = db.get_bind()
    dialect = bind.dialect.name if bind is not None else "sqlite"
    if dialect == "postgresql":
        # Identifier is allowlisted above; nextval cannot take a bound name.
        value = db.execute(text(f"SELECT nextval('{seq_name}')")).scalar()  # nosemgrep
        if value is None:
            raise RuntimeError(f"Sequence {seq_name} returned no value")
        return int(value)
    row = db.get(IdSequence, seq_name)
    if row is None:
        row = IdSequence(name=seq_name, value=start)
        db.add(row)
        db.flush()
        return start
    row.value += 1
    db.flush()
    return row.value


def next_job_card_ref(db: Session) -> str:
    return f"JC-{next_sequence_value(db, 'job_card_ref_seq')}"


def next_booking_ref(db: Session) -> str:
    return f"BK-{next_sequence_value(db, 'booking_ref_seq')}"


def next_support_ticket_ref(db: Session) -> str:
    return f"ST-{next_sequence_value(db, 'support_ticket_ref_seq')}"


def next_invoice_number(db: Session) -> str:
    year = datetime.now(IST).year
    value = next_sequence_value(db, "invoice_number_seq")
    return f"INV-{year}-{value:06d}"


def next_visit_ref(db: Session, job_card_ref: str, sequence: int = 1) -> str:
    digits = "".join(ch for ch in job_card_ref if ch.isdigit()) or str(
        next_sequence_value(db, "visit_ref_seq")
    )
    suffix = chr(64 + sequence) if 1 <= sequence <= 26 else str(sequence)
    return f"V-{digits}-{suffix}"
