from __future__ import annotations

import logging

import httpx

from app.config import settings
from app.integrations.ports.messaging import SendResult, WhatsAppMessage

logger = logging.getLogger("caratom.whatsapp")


def _redact(e164: str) -> str:
    return e164[-4:] if e164 else ""


class TwilioWhatsAppAdapter:
    async def send_whatsapp(self, msg: WhatsAppMessage) -> SendResult:
        sid = settings.whatsapp_twilio_account_sid
        token = settings.whatsapp_twilio_auth_token
        from_number = settings.whatsapp_twilio_from
        if not sid or not token or not from_number:
            return SendResult(success=False, error_code="WHATSAPP_NOT_CONFIGURED", retryable=False)
        url = f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"
        content_vars = {str(i + 1): value for i, value in enumerate(msg.template_params.values())}
        data = {
            "From": (
                from_number if from_number.startswith("whatsapp:") else f"whatsapp:{from_number}"
            ),
            "To": msg.to_e164 if msg.to_e164.startswith("whatsapp:") else f"whatsapp:{msg.to_e164}",
            "ContentSid": msg.template_name,
            "ContentVariables": str(content_vars).replace("'", '"'),
        }
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(url, data=data, auth=(sid, token))
        except httpx.HTTPError:
            logger.warning("whatsapp_transport to_last4=%s", _redact(msg.to_e164))
            return SendResult(success=False, error_code="TRANSPORT", retryable=True)
        if response.status_code >= 500:
            return SendResult(success=False, error_code="TWILIO_5XX", retryable=True)
        if response.status_code >= 400:
            return SendResult(success=False, error_code="TWILIO_4XX", retryable=False)
        body = response.json() if response.content else {}
        return SendResult(
            success=True,
            provider_message_id=body.get("sid"),
            receipt={"to_last4": _redact(msg.to_e164), "template": msg.template_name},
        )
