from datetime import UTC, datetime
from uuid import uuid4

from app.common.errors import DomainProblem
from app.core.deps import CurrentUser
from app.db.models import Profile
from app.modules.support.models import SupportTicket
from app.modules.support.service import SupportService
from tests.conftest import TestingSessionLocal


def _user(profile_id: str) -> CurrentUser:
    return CurrentUser(
        id=profile_id,
        role="customer",
        phone="+919800000099",
        full_name=None,
        phone_verified=True,
        created_at=datetime.now(UTC),
        claims={"sub": profile_id},
    )


def test_cancel_rejected_after_dispatch() -> None:
    db = TestingSessionLocal()
    try:
        profile_id = str(uuid4())
        db.add(Profile(id=profile_id, role="customer", is_active=True, phone="+919800000099"))
        ticket = SupportTicket(
            id=str(uuid4()),
            profile_id=profile_id,
            ticket_type="ROADSIDE",
            status="DISPATCHED_STUB",
            priority="EMERGENCY",
            issue_code="FLAT_TYRE",
            issue_label="Flat tyre",
            public_ref="ST-7999",
            created_at=datetime.now(UTC),
        )
        db.add(ticket)
        db.commit()
        service = SupportService(db)
        try:
            service.cancel(ticket.id, _user(profile_id))
            raise AssertionError("cancel should fail")
        except DomainProblem as exc:
            assert exc.code == "TICKET_NOT_CANCELLABLE"
    finally:
        db.close()
