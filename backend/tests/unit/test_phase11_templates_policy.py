from app.modules.notifications.channel_policy import channels_for, kind_for
from app.modules.notifications.templates_render import render_template
from app.worker.jobs.outbox_dispatcher import backoff_seconds


def test_customer_channel_matrix() -> None:
    assert channels_for("slot_confirmed", "customer") == ["push", "sms"]
    assert channels_for("visit_assigned", "technician") == ["push"]
    assert channels_for("advisor_case_waiting", "admin") == ["push"]
    assert kind_for("payment_due") == "PAYMENT"


def test_template_snapshot_slot_confirmed() -> None:
    rendered = render_template(
        "slot_confirmed",
        {
            "service_name": "Health report",
            "booking_id": "b1",
            "deep_link_short": "https://staging.caratom.app/l/b/b1",
        },
    )
    assert rendered["title"] == "Visit confirmed"
    assert "Health report" in rendered["body"]
    assert rendered["deep_link_path"] == "caratom://booking/b1"


def test_backoff_schedule() -> None:
    assert backoff_seconds(1) == 30
    assert backoff_seconds(2) == 120
    assert backoff_seconds(3) == 300
    assert backoff_seconds(8) == 28800
    assert backoff_seconds(99) == 28800
