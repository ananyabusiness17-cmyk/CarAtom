from app.modules.payments.webhook import verify_razorpay_signature


def test_signature_valid() -> None:
    body = b'{"event":"payment.captured"}'
    secret = "whsec_test"
    import hashlib
    import hmac

    signature = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    assert verify_razorpay_signature(body, signature, secret) is True


def test_signature_invalid() -> None:
    assert verify_razorpay_signature(b"{}", "deadbeef", "secret") is False


def test_signature_tampered_body() -> None:
    import hashlib
    import hmac

    secret = "whsec_test"
    signature = hmac.new(secret.encode(), b'{"event":"a"}', hashlib.sha256).hexdigest()
    assert verify_razorpay_signature(b'{"event":"b"}', signature, secret) is False
