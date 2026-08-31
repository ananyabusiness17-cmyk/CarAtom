# §24 Exit gate — in-repo vs operator

## In-repo (this phase)

- [x] Production env inventory (names only)
- [x] Runbooks committed
- [x] Legal pack + public `/legal/*` + OTP consent + profile legal/mailto erasure
- [x] Rate limits, health, CORS production defaults, GSTIN env, retention jobs
- [x] EAS internal vs store split
- [x] Universal link files on admin web
- [x] Walkthrough E2E specs (`pnpm test:e2e:walkthrough` — authenticated posts skip without `E2E_TOKEN`)
- [x] Full-repo `pnpm security` passed (Semgrep, Gitleaks, OSV, local ZAP)
- [x] SMS DLT: push-only fallback documented

## Operator after Razorpay / Supabase / Railway / stores

- [ ] Supabase prod + backups
- [ ] Railway prod api/worker/redis/admin
- [ ] Custom domains TLS
- [ ] Alembic prod at head
- [ ] Backup restore drill evidence
- [ ] Monitoring alerts tested
- [ ] App Store Ready for Sale
- [ ] Play production track
- [ ] Private apps on ≥2 devices
- [ ] Universal links validators
- [ ] EAS Update production channel
- [ ] Razorpay live webhook + ₹1 refund
- [ ] DLT or keep push-only
- [ ] WhatsApp templates or fallback
- [ ] Push on prod devices
- [ ] Counsel review or risk acceptance
- [ ] Finance GST sample
- [ ] Tag `v1.0.0` (do not tag in this agent pass)

Not launched until operator boxes are checked.
