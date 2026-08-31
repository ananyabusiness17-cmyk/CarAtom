from urllib.parse import urlparse

from arq.connections import RedisSettings
from arq.cron import cron

from app.config import settings
from app.modules.invoices.tasks import generate_invoice_pdf
from app.worker.jobs import (
    notification_reminders,
    outbox_dispatcher,
    push_receipt_poll,
    retention_purge,
)


async def health_ping(ctx: dict) -> str:
    return "ok"


async def startup(ctx: dict) -> None:
    print("CARATOM worker started (Phase 12 — outbox + retention)")


def redis_settings_from_url(url: str) -> RedisSettings:
    parsed = urlparse(url)
    database = (parsed.path or "/0").lstrip("/") or "0"
    return RedisSettings(
        host=parsed.hostname or "localhost",
        port=parsed.port or 6379,
        password=parsed.password,
        database=int(database),
    )


class WorkerSettings:
    functions = [
        health_ping,
        generate_invoice_pdf,
        outbox_dispatcher.run,
        notification_reminders.run,
        push_receipt_poll.run,
        retention_purge.run,
    ]
    cron_jobs = [
        cron(outbox_dispatcher.run, second={0, 30}),
        cron(notification_reminders.run, minute=0),
        cron(push_receipt_poll.run, minute={5, 35}),
        cron(retention_purge.run, hour={3}, minute={15}),
    ]
    on_startup = startup
    redis_settings = redis_settings_from_url(settings.redis_url)
