from __future__ import annotations

import logging

import httpx
from sqlalchemy import select

from app.config import settings
from app.modules.notifications.models import OutboxEvent

logger = logging.getLogger("caratom.push_receipts")
RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts"


async def run(ctx: dict) -> str:
    from app.db.session import SessionLocal

    db = SessionLocal()
    try:
        rows = list(
            db.scalars(
                select(OutboxEvent)
                .where(
                    OutboxEvent.channel == "push",
                    OutboxEvent.status == "SUCCEEDED",
                )
                .limit(50)
            ).all()
        )
        ids = []
        for row in rows:
            receipt = row.provider_receipt or {}
            ticket = receipt.get("ticket") if isinstance(receipt, dict) else None
            ticket_id = ticket.get("id") if isinstance(ticket, dict) else None
            if ticket_id:
                ids.append(str(ticket_id))
        if not ids:
            return "receipts=0"
        headers = {"Accept": "application/json", "Content-Type": "application/json"}
        if settings.expo_access_token:
            headers["Authorization"] = f"Bearer {settings.expo_access_token}"
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(RECEIPTS_URL, json={"ids": ids}, headers=headers)
        if response.status_code >= 400:
            logger.warning("push_receipt_poll status=%s", response.status_code)
            return "receipts=error"
        return f"receipts={len(ids)}"
    finally:
        db.close()
