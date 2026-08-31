from __future__ import annotations

import os
import random
from uuid import uuid4

from app.integrations.ports.messaging import (
    PushMessage,
    SendResult,
    SmsMessage,
    WhatsAppMessage,
)


class FakeMessagingAdapter:
    """In-memory adapter for tests and local development. Never calls providers."""

    def __init__(self, fail_rate: float | None = None) -> None:
        raw = os.environ.get("FAKE_MESSAGING_FAIL_RATE") if fail_rate is None else str(fail_rate)
        try:
            self.fail_rate = float(raw or 0)
        except ValueError:
            self.fail_rate = 0.0
        self.sent: list[tuple[str, object, SendResult]] = []

    def _maybe_fail(self) -> SendResult | None:
        if self.fail_rate > 0 and random.random() < self.fail_rate:
            return SendResult(
                success=False,
                error_code="FAKE_RETRYABLE",
                retryable=True,
            )
        return None

    async def send_push(self, msg: PushMessage) -> SendResult:
        failed = self._maybe_fail()
        if failed:
            self.sent.append(("push", msg, failed))
            return failed
        result = SendResult(
            success=True,
            provider_message_id=f"fake-push-{uuid4()}",
            receipt={"status": "ok", "token_prefix": msg.to_token[:18]},
        )
        self.sent.append(("push", msg, result))
        return result

    async def send_sms(self, msg: SmsMessage) -> SendResult:
        failed = self._maybe_fail()
        if failed:
            self.sent.append(("sms", msg, failed))
            return failed
        result = SendResult(
            success=True,
            provider_message_id=f"fake-sms-{uuid4()}",
            receipt={"status": "ok", "to_last4": msg.to_e164[-4:]},
        )
        self.sent.append(("sms", msg, result))
        return result

    async def send_whatsapp(self, msg: WhatsAppMessage) -> SendResult:
        failed = self._maybe_fail()
        if failed:
            self.sent.append(("whatsapp", msg, failed))
            return failed
        result = SendResult(
            success=True,
            provider_message_id=f"fake-wa-{uuid4()}",
            receipt={"status": "ok", "template": msg.template_name, "to_last4": msg.to_e164[-4:]},
        )
        self.sent.append(("whatsapp", msg, result))
        return result
