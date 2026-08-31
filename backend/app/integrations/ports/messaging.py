from dataclasses import dataclass, field
from typing import Protocol


@dataclass
class PushMessage:
    to_token: str
    title: str
    body: str
    data: dict[str, str] = field(default_factory=dict)
    priority: str = "default"


@dataclass
class SmsMessage:
    to_e164: str
    body: str
    template_id: str | None = None


@dataclass
class WhatsAppMessage:
    to_e164: str
    template_name: str
    template_params: dict[str, str] = field(default_factory=dict)


@dataclass
class SendResult:
    success: bool
    provider_message_id: str | None = None
    error_code: str | None = None
    retryable: bool = False
    receipt: dict | None = None
    revoke_token: bool = False


class MessagingPort(Protocol):
    async def send_push(self, msg: PushMessage) -> SendResult: ...

    async def send_sms(self, msg: SmsMessage) -> SendResult: ...

    async def send_whatsapp(self, msg: WhatsAppMessage) -> SendResult: ...
