# RUNBOOK — Private app distribution

**NEVER submit technician or admin-mobile to a public App Store or Play Store consumer listing.**

Bundle IDs (locked in Phase 12 config):

| App | iOS / Android id |
|-----|------------------|
| Technician | `in.caratom.technician` |
| Admin-mobile | `in.caratom.adminmobile` |

## Methods

| Platform | Method |
|----------|--------|
| iOS | EAS internal / Ad Hoc UDIDs (≤100) / Apple Custom Apps |
| Android | Play **internal testing** allowlisted emails **or** MDM APK. Not a public production track. |

APK/IPA links belong on the ops wiki, not public GitHub.

## Install

```text
1. Ops collects iOS UDID or Android Play email
2. Register in Apple/Google allowlist
3. eas build --profile internal --platform all   (apps/technician or apps/admin-mobile)
4. Send install link via ops WhatsApp — not customer SMS
5. Technician logs in with role=technician; admin-mobile with role=admin
6. Confirm today / board loads production jobs only
7. Record device + version in the ops spreadsheet
```

## Production API URL

Private builds must bake `EXPO_PUBLIC_API_BASE_URL=https://api.caratom.in` (same API as customer). Role is enforced server-side.

## Verification (operator)

| Check | Device 1 | Device 2 |
|-------|----------|----------|
| Technician install | pending | pending |
| Admin-mobile install | pending | pending |

Ops sign-off: ________  date: ________
