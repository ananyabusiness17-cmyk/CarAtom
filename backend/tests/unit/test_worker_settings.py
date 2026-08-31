import os
import subprocess
import sys
from pathlib import Path

from app.worker.jobs import (
    notification_reminders,
    outbox_dispatcher,
    push_receipt_poll,
    retention_purge,
)
from app.worker.main import (
    WorkerSettings,
    generate_invoice_pdf,
    health_ping,
    redis_settings_from_url,
)


def test_redis_settings_from_url() -> None:
    parsed = redis_settings_from_url("redis://localhost:6379/0")
    assert parsed.host == "localhost"
    assert parsed.port == 6379
    assert parsed.database == 0


def test_worker_registers_health_ping() -> None:
    assert health_ping in WorkerSettings.functions
    assert generate_invoice_pdf in WorkerSettings.functions
    assert outbox_dispatcher.run in WorkerSettings.functions
    assert notification_reminders.run in WorkerSettings.functions
    assert push_receipt_poll.run in WorkerSettings.functions
    assert retention_purge.run in WorkerSettings.functions
    assert WorkerSettings.redis_settings.host
    assert len(WorkerSettings.cron_jobs) == 4


def test_worker_settings_import_matches_arq_cli() -> None:
    """Arq loads WorkerSettings in a fresh process; conftest cannot hide this."""
    backend = Path(__file__).resolve().parents[2]
    result = subprocess.run(
        [sys.executable, "-c", "from app.worker.main import WorkerSettings"],
        cwd=backend,
        capture_output=True,
        text=True,
        env={**os.environ, "PYTHONPATH": str(backend)},
    )
    assert result.returncode == 0, result.stderr
