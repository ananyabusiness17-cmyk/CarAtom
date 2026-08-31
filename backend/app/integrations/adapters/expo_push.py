from __future__ import annotations

import logging

import httpx

from app.config import settings
from app.integrations.ports.messaging import PushMessage, SendResult

logger = logging.getLogger("caratom.expo_push")

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
BATCH_SIZE = 100


class ExpoPushAdapter:
    async def send_push(self, msg: PushMessage) -> SendResult:
        headers = {"Accept": "application/json", "Content-Type": "application/json"}
        if settings.expo_access_token:
            headers["Authorization"] = f"Bearer {settings.expo_access_token}"
        payload = {
            "to": msg.to_token,
            "title": msg.title,
            "body": msg.body,
            "data": {str(k): str(v) for k, v in msg.data.items()},
            "priority": msg.priority,
            "sound": "default",
        }
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(EXPO_PUSH_URL, json=[payload], headers=headers)
        except httpx.HTTPError as exc:
            logger.warning("expo_push_transport error_code=TIMEOUT")
            return SendResult(
                success=False,
                error_code="TRANSPORT",
                retryable=True,
                receipt={"error": str(exc)[:80]},
            )
        if response.status_code >= 500:
            return SendResult(
                success=False,
                error_code="EXPO_5XX",
                retryable=True,
                receipt={"status": response.status_code},
            )
        if response.status_code >= 400:
            return SendResult(
                success=False,
                error_code="EXPO_4XX",
                retryable=False,
                receipt={"status": response.status_code},
            )
        body = response.json()
        tickets = body.get("data") or []
        ticket = tickets[0] if tickets else body
        if isinstance(ticket, dict) and ticket.get("status") == "error":
            details = ticket.get("details") or {}
            revoke = details.get("error") == "DeviceNotRegistered"
            return SendResult(
                success=False,
                error_code=str(details.get("error") or "EXPO_ERROR"),
                retryable=not revoke,
                revoke_token=revoke,
                receipt={"ticket": ticket},
            )
        ticket_id = ticket.get("id") if isinstance(ticket, dict) else None
        return SendResult(success=True, provider_message_id=ticket_id, receipt={"ticket": ticket})
