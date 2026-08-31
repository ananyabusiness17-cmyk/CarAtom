# §22 Regression baseline (in-repo)

| Phase | Focus | In-repo command / artifact | Live |
|-------|--------|----------------------------|------|
| 03 | General service book | `e2e/walkthrough/general-service.spec.ts` + pytest GS | BLOCKED staging |
| 04 | Advisor + estimate | `e2e/walkthrough/repair-advisor.spec.ts` | BLOCKED staging |
| 05 | One-man + SOS + login | `e2e/walkthrough/oneman-sos.spec.ts` | BLOCKED staging |
| 06 | Technician offline | unit tests + `TECHNICIAN-MANUAL.md` | BLOCKED device |
| 07 | Two-visit inspection | pytest IR e2e | BLOCKED staging |
| 08 | Razorpay + invoice | webhook idempotency + GST env invoice tests | live ₹1 BLOCKED |
| 09 | Admin inventory + audit | `pnpm test:e2e:admin` | BLOCKED prod |
| 10 | Dispatch assign | `ADMIN-MOBILE-MANUAL.md` | BLOCKED device |
| 11 | Push + deep link + outbox | outbox integration tests | BLOCKED device |

**Tags:** do **not** git tag `v1.0.0` or `v1.0.0-rc1` in this agent pass. Operator tags after accounts and CI on `.github/workflows/release.yml`.
