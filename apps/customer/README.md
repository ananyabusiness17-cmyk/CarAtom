# CARATOM Customer

Expo Router app for the public customer product. **Phase 04: Service + repair + advisor** (gpr-01 → gpr-12) on the Service + repair tab. General service (gs-01 → gs-10) is unchanged. One-man and SOS still use later-phase stubs.

```powershell
pnpm --filter @caratom/customer start
```

Metro runs on port **8081**. Scan the QR code with Expo Go (SDK 52) for most flows.

**Push notifications:** Expo Go can receive Android push. iOS push requires an EAS development build (`eas build --profile development`). Physical-device “push within 60s” and live `eas update` need an Expo project ID and login — those are not run in CI. Channels in `eas.json`: `development` / `preview` / `production`. OTA is configured with `runtimeVersion.policy = appVersion` but `updates.enabled` stays false until project IDs exist. Rollback: pin the previous runtime in EAS and republish that channel.

Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_BASE_URL`. Never put `SUPABASE_SERVICE_ROLE_KEY` in this app. On a physical phone the app uses the Metro LAN host and talks to the API on port 8000.

## Service + repair path (gpr-01 → gpr-12)

1. Home → **General service + repair** tab → **Select repairs / replacements**
2. Repairs cart (`/job-card/repairs-cart`)
3. Vehicle picker with 12-dot rail (`?flow=service-repair`)
4. Job card with repair lines → Review estimate
5. **Submit estimate & request callback** (OTP if needed) → waiting / revised estimate
6. Accept → checkout details → slot → **Service + repairs booked**
7. Deny → `/job-card/{id}/repairs-cart?mode=deny`

Without admin-mobile, tap **Simulate advisor estimate** on the waiting screen in `__DEV__`.

## General Service path (gs-01 → gs-10)

1. Home → **General service** tab → **Start job card**
2. Vehicle picker: make → model → year → fuel (`/vehicle/*`)
3. Job card (`/job-card/{id}`) → Review estimate
4. Estimate accept (`/job-card/{id}/estimate`)
5. Combined details (`/checkout/details`) — OTP interrupt returns here via `returnTo`
6. Slot (`/checkout/slot`) — one CTA holds then books
7. Confirmed (`/booking/{id}`)

Navigation follows `generalServiceCoordinator` or `serviceRepairCoordinator` plus `FlowDecision.required_next_action`. Totals come from the API only.

## Accepted Phase 03 debt (§23)

| Item | Paydown |
|------|---------|
| Static vehicle catalog (not API) | Post-MVP catalog API |
| Map placeholder (no geocode) | Phase 05 |
| No GST line on estimate | Phase 08 |
| Global slot capacity (not per-tech) | Phase 06 |
| Guest job card before auth | Auth at finalization (documented) |
| No orders list after book | Phase 05 |
| Search on gs-01 non-functional | Future search |
| Manual contract sync | OpenAPI codegen Phase 11 |
| Redis slot cache absent | Phase 11 |
| Visit record not created on book | Phase 06 |
| Dev fixture refs `JC-1050` sequence | Phase 12 |
