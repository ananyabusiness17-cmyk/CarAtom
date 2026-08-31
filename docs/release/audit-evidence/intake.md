# Mode C intake — CARATOM Phase 12

- **Systems:** customer / technician / admin-mobile Expo apps, admin Next.js, FastAPI, ARQ worker, Postgres (Supabase), Redis
- **Environments in this pass:** repository + local/CI. Production and staging cloud: **not provisioned yet** (operator after Phase 12)
- **Access:** source code. No production credentials in the agent session
- **Jurisdiction:** India (Karnataka first), DPDP Act 2023
- **Risk tier:** payments + PII (phone, address) — treat as launch-grade
- **Prior audits:** `security/SECURITY_AUDIT.md`, Phases 08–11 security gates
- **Limitation:** live TLS, store listing, backup drill, Razorpay live cannot be verified until accounts exist
