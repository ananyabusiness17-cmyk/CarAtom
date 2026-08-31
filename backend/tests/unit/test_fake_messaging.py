import pytest

from app.integrations.adapters.fake_messaging import FakeMessagingAdapter
from app.integrations.ports.messaging import PushMessage, SmsMessage


@pytest.mark.asyncio
async def test_fake_adapter_logs_success() -> None:
    adapter = FakeMessagingAdapter(fail_rate=0)
    result = await adapter.send_push(
        PushMessage(to_token="ExponentPushToken[abc]", title="Hi", body="Body")
    )
    assert result.success is True
    assert adapter.sent[0][0] == "push"


@pytest.mark.asyncio
async def test_fake_adapter_can_fail(monkeypatch) -> None:
    adapter = FakeMessagingAdapter(fail_rate=1)
    result = await adapter.send_sms(SmsMessage(to_e164="+919876543210", body="Hi"))
    assert result.success is False
    assert result.retryable is True
    assert result.error_code == "FAKE_RETRYABLE"
