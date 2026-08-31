# §21 Walkthrough conformance

Automated at **API contract** layer (`e2e/walkthrough/`) plus existing pytest GS/repair/oneman/SOS. Native screens: device sheets. Staging-with-prod-parity: BLOCKED until staging exists. Do not claim “3× green on staging.”

| Area | Automation | Status |
|------|------------|--------|
| gs-01…gs-10 | Playwright API (`general-service.spec.ts`) + `test_general_service_e2e` | code PASS; device pending |
| gpr-* + deny-cart | Playwright API (`repair-advisor.spec.ts`) + advisor e2e pytest | code PASS; device pending |
| om-* + sos-* | Playwright API (`oneman-sos.spec.ts`) + pytest | code PASS; device pending |
| login/orders/profile | customer app + OTP consent + profile legal/mailto erasure | in-repo; device pending |
| Technician today→qc | `e2e/walkthrough/TECHNICIAN-MANUAL.md` | manual |
| Admin mobile adm/board | `e2e/walkthrough/ADMIN-MOBILE-MANUAL.md` | manual |
| Admin web ops | `e2e/admin` + `admin-web-ops.spec.ts` | Playwright mocked PASS |
| Inspection+repair | pytest IR e2e | code PASS |

Payment / override / advisor loops remain launch-blocking if they fail on staging — re-run after accounts.

Run: `pnpm test:e2e:walkthrough` (2026-08-31: 5 passed, 4 skipped without `E2E_TOKEN`). Keep `pnpm test:e2e:admin` unchanged (6 passed).
