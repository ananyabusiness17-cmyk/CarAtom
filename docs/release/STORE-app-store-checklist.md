# App Store checklist — CARATOM Customer

Operator executes after EAS production build. This file is a checklist, **not** a submission receipt.

Bundle ID: `in.caratom.customer`  
Version: `1.0.0` (store-visible)

## Pre-submission

1. [ ] Production API health from TestFlight: `https://api.caratom.in/health`
2. [ ] OTP login on prod Supabase (+91)
3. [ ] Razorpay checkout live test (finance)
4. [ ] Push on prod worker
5. [ ] Deep link from notification opens booking
6. [ ] Privacy policy URL live (`https://admin.caratom.in/legal/privacy`)
7. [ ] App Tracking Transparency: **no IDFA** unless analytics changes
8. [ ] Location strings match actual use (address pin / SOS — not background tracking of customers)
9. [ ] Screenshots match current UI (light-blue accent `#5DB7E8`) — capture on device, no stock photos. See `apps/customer/store/screenshots/`
10. [ ] `node scripts/release/pre-store-build-check.mjs` exit 0 (no staging hosts in config)

## Privacy nutrition (declare what we actually collect)

- Phone number (account)
- Approximate location if the user pins an address / SOS
- Payment processed by Razorpay (CARATOM does not store PAN)
- App activity analytics events (PII stripped server-side)

## Review notes (paste into App Store Connect)

Provide a Bengaluru test account (+91) and a 30-second demo of General Service booking. Physical automotive service; Razorpay for real-world services.

## Rejection playbook

| Reason | Response |
|--------|----------|
| 4.2 minimum functionality | Demo video + test account |
| 5.1.1 data collection | Align nutrition labels with SDKs |
| 3.1.1 payments | Physical service; Razorpay |
| 2.1 crashes | Symbolicated log; EAS Update if JS-only |

## Status

| Item | Value |
|------|--------|
| App Store Connect | not submitted — operator after Apple account |
| Ready for Sale | blocked |
