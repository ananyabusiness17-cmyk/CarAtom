from __future__ import annotations

from app.config import settings
from app.integrations.adapters.expo_push import ExpoPushAdapter
from app.integrations.adapters.fake_messaging import FakeMessagingAdapter
from app.integrations.adapters.sms_msg91 import Msg91SmsAdapter
from app.integrations.adapters.whatsapp_twilio import TwilioWhatsAppAdapter
from app.integrations.ports.messaging import (
    PushMessage,
    SendResult,
    SmsMessage,
    WhatsAppMessage,
)


class CompositeMessagingAdapter:
    def __init__(self) -> None:
        use_real = settings.env != "development" or settings.force_real_messaging
        self._fake = FakeMessagingAdapter(settings.fake_messaging_fail_rate)
        self._push = ExpoPushAdapter() if use_real else self._fake
        sms_real = use_real and settings.sms_provider == "msg91"
        wa_real = use_real and settings.whatsapp_provider == "twilio"
        self._sms = Msg91SmsAdapter() if sms_real else self._fake
        self._whatsapp = TwilioWhatsAppAdapter() if wa_real else self._fake

    async def send_push(self, msg: PushMessage) -> SendResult:
        return await self._push.send_push(msg)

    async def send_sms(self, msg: SmsMessage) -> SendResult:
        return await self._sms.send_sms(msg)

    async def send_whatsapp(self, msg: WhatsAppMessage) -> SendResult:
        return await self._whatsapp.send_whatsapp(msg)


def get_messaging_adapter() -> CompositeMessagingAdapter:
    return CompositeMessagingAdapter()
