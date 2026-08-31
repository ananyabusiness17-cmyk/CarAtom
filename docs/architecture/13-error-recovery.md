# 13 — Error and recovery architecture

## Error taxonomy

Every API error maps to a stable code, human message, retryability, current state, allowed actions, and request id.

Categories:

- `AUTH_REQUIRED`, `AUTH_EXPIRED`, `FORBIDDEN`;
- `VALIDATION_FAILED`, `INCOMPATIBLE_VEHICLE`, `SERVICE_UNAVAILABLE`;
- `PRICING_FAILED`, `ESTIMATE_EXPIRED`, `ESTIMATE_VERSION_MISMATCH`;
- `ADVISOR_UNAVAILABLE`, `CUSTOMER_UNREACHABLE`, `SCOPE_CHANGED`;
- `SLOT_UNAVAILABLE`, `HOLD_EXPIRED`, `BOOKING_CONFLICT`;
- `PAYMENT_FAILED`, `PAYMENT_VERIFICATION_PENDING`, `PAYMENT_ALREADY_SETTLED`;
- `OFFLINE`, `TIMEOUT`, `RATE_LIMITED`, `INTEGRATION_UNAVAILABLE`, `UNKNOWN`.

## Customer recovery

### No internet/API failure

Show last-known draft/status, an explicit offline banner, retry action, and what cannot be completed offline. Draft edits remain local. Do not show a fake success toast for a write that did not reach the server.

### Authentication expiry

Refresh once. If it fails, route to OTP/login with a preserved safe draft. After login, reconcile draft against server version and ask before merging conflicts.

### Pricing failure or stale estimate

Keep the Job Card editable, show the last valid estimate as stale, and offer retry. Never let a stale estimate create a booking.

### Add-on unavailable/incompatible

Keep the concern and explain why the requested line cannot be added. Offer another repair, free-text note, or support. Do not silently substitute.

### Advisor missed/unreachable

Persist attempts and next callback. Let customer choose a callback window or contact support. Escalate in admin after configured attempts. No dead-end waiting screen.

### Advisor changes price/scope

Show “Updated estimate” with a clear change summary. Accepting the old version is no longer legal. Rejecting returns to the editable Job Card or leaves the case open, depending on customer choice.

### Slot unavailable/hold expired

Release stale hold, retain all other checkout data, reload alternatives, and explain that availability changed. Confirmation endpoint is idempotent so retry can safely recover a network timeout.

### Duplicate booking

Query by idempotency key/client request id and present the existing booking. Never create a second booking because the first response was lost.

### Payment failure/unknown result

Show provider-safe failure or “verifying payment” state. Re-query Payment on resume/deep link. Offer a new order only after server says the prior attempt failed/expired. Never transition Invoice to paid from client callback.

## Technician recovery

- Offline queue records event ids and payload checksums; replay is idempotent.
- Photos remain locally queued until signed upload and metadata creation succeed.
- Conflicting status is surfaced for admin review, not overwritten by last write.
- Camera/location permission denial offers settings path and manual notes where operationally safe.
- A failed completion leaves the Visit in a recoverable state with cached evidence.

## Admin recovery

Admin sees provider failures, stale jobs, undelivered notifications, and conflicting transitions in an exception queue. Override controls require reason and show before/after. Offline payment is visually and semantically separate from Razorpay capture.

## App lifecycle

On launch/resume, fetch current session and any active booking/estimate/payment deep-link target. Compare local draft schema/version. Backgrounding never commits an irreversible action implicitly.

## Retention and expiry

Drafts, estimates, slot holds, payment orders, and advisor cases have explicit expiry metadata. The API tells the UI what expired and the legal next action. Exact retention periods are documented in settings/operations once chosen.

