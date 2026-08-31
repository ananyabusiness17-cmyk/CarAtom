from __future__ import annotations

import logging

import httpx

from app.config import settings
from app.integrations.ports.messaging import SendResult, SmsMessage

logger = logging.getLogger("caratom.sms")

MSG91_URL = "https://control.msg91.com/api/v5/flow"


def _redact(e164: str) -> str:
    return e164[-4:] if e164 else ""


class Msg91SmsAdapter:
    async def send_sms(self, msg: SmsMessage) -> SendResult:
        key = settings.sms_api_key
        if not key:
            return SendResult(success=False, error_code="SMS_NOT_CONFIGURED", retryable=False)
        body = (msg.body or "")[:1600]
        payload = {
            "template_id": msg.template_id or settings.sms_template_id,
            "sender": settings.sms_sender_id,
            "short_url": "0",
            "recipients": [{"mobiles": msg.to_e164.lstrip("+"), "body": body}],
        }
        headers = {"authkey": key, "Content-Type": "application/json"}
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(MSG91_URL, json=payload, headers=headers)
        except httpx.HTTPError:
            logger.warning("sms_transport to_last4=%s", _redact(msg.to_e164))
            return SendResult(success=False, error_code="TRANSPORT", retryable=True)
        if response.status_code >= 500:
            return SendResult(success=False, error_code="MSG91_5XX", retryable=True)
        if response.status_code >= 400:
            return SendResult(success=False, error_code="MSG91_4XX", retryable=False)
        data = response.json() if response.content else {}
        message_id = str(data.get("message") or data.get("request_id") or "")
        return SendResult(
            success=True,
            provider_message_id=message_id or None,
            receipt={"to_last4": _redact(msg.to_e164)},
        )
