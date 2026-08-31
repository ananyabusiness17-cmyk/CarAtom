from app.modules.bookings.progress_composer import compose_customer_progress, derive_allowed_actions


def test_progress_matrix_rows() -> None:
    cases = [
        ("CONFIRMED", ["SCHEDULED"], None, 0, [], False, None, "BOOKING_CONFIRMED"),
        ("CONFIRMED", ["EN_ROUTE"], None, 0, [], False, None, "VISIT_IN_PROGRESS"),
        ("CONFIRMED", ["CHECKED_IN"], None, 0, [], False, None, "VISIT_IN_PROGRESS"),
        (
            "CONFIRMED",
            ["COMPLETED"],
            None,
            0,
            [],
            False,
            "ESTIMATE_APPROVAL_REQUIRED",
            "ESTIMATE_APPROVAL_REQUIRED",
        ),
        (
            "CONFIRMED",
            ["COMPLETED"],
            "ISSUED",
            200000,
            [],
            False,
            "PARTS_PAYMENT_REQUIRED",
            "PARTS_PAYMENT_REQUIRED",
        ),
        (
            "CONFIRMED",
            ["COMPLETED"],
            "PARTIALLY_PAID",
            100000,
            ["CAPTURED"],
            False,
            "REPAIR_BOOKING_REQUIRED",
            "REPAIR_BOOKING_REQUIRED",
        ),
        ("COMPLETED", ["COMPLETED"], "ISSUED", 997000, [], False, None, "PAYMENT_DUE"),
        (
            "COMPLETED",
            ["COMPLETED"],
            "ISSUED",
            997000,
            ["PENDING"],
            False,
            None,
            "PAYMENT_VERIFICATION_PENDING",
        ),
        ("COMPLETED", ["COMPLETED"], "PAID", 0, ["CAPTURED"], False, None, "COMPLETED"),
        ("COMPLETED", ["COMPLETED"], "PAID", 0, ["CAPTURED"], True, None, "COMPLETED"),
    ]
    for booking, visits, invoice, balance, payments, review, ir, expected in cases:
        progress = compose_customer_progress(
            booking_status=booking,
            job_status="COMPLETED" if booking == "COMPLETED" else "BOOKING_CREATED",
            flow_policy="INSPECTION_REPAIR" if ir else "GENERAL_SERVICE",
            visit_states=visits,
            invoice_status=invoice,
            invoice_balance_minor=balance,
            payment_statuses=payments,
            review_submitted=review,
            ir_progress=ir,
        )
        assert progress.key == expected, (expected, progress.key, ir)


def test_allowed_actions_pay_and_review() -> None:
    actions = derive_allowed_actions(
        invoice_status="ISSUED",
        invoice_balance_minor=100,
        payment_statuses=[],
        review_submitted=False,
        progress_key="PAYMENT_DUE",
        visit_states=["COMPLETED"],
    )
    assert "PAY_BALANCE" in actions
    paid = derive_allowed_actions(
        invoice_status="PAID",
        invoice_balance_minor=0,
        payment_statuses=["CAPTURED"],
        review_submitted=False,
        progress_key="COMPLETED",
        visit_states=["COMPLETED"],
    )
    assert "SUBMIT_REVIEW" in paid
