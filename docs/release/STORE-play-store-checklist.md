# Play Store checklist — CARATOM Customer

Package: `in.caratom.customer`  
Track: production with **10% staged rollout** then 100%.

Recommended path even if launch is urgent: internal testing → closed testing → production.

## Data safety (match actual SDKs)

| Data | Collected | Shared | Purpose |
|------|-----------|--------|---------|
| Phone number | Yes | No (except SMS OTP provider) | Account |
| Approximate location | Optional | No | Address / SOS |
| App activity | Yes (analytics, PII stripped) | No | Product analytics |
| Financial info | Payment via Razorpay SDK | Razorpay | Pay for service |

Permissions: notifications; location when in use (optional).

## Pre-upload

1. [ ] AAB from `eas build --profile production --platform android`
2. [ ] `node scripts/release/pre-store-build-check.mjs`
3. [ ] Target API level meets Play 2026 requirement
4. [ ] Privacy policy URL
5. [ ] Technician / admin-mobile **not** listed on the public store

## Status

| Item | Value |
|------|--------|
| Play Console | not submitted — operator after Google Play account |
| Production track | blocked |
