# §23 Technical debt accepted at in-repo freeze

Copied from PHASE-12 §23. Owners apply after live launch.

| Debt item | Severity | Accept at launch? | Post-launch owner |
|-----------|----------|-------------------|-------------------|
| GlitchTip/Sentry | Low | Yes | Engineering |
| Granular notification prefs | Low | Yes | Product |
| Multi-language | Low | Yes | Product |
| Full WCAG audit | Medium | Yes with documented gaps | Compliance |
| Realtime estimate WebSocket | Low | Yes | Engineering |
| Automated pen test | Medium | Recommended pre-scale | Security |
| Multi-region Railway | Low | Yes | Infra |
| Customer marketing push | Low | Yes | Marketing |
| Procurement ERP | Low | Yes | Ops |
| MDM for technician devices | Medium | Partial manual install | Ops |
| SMS DLT + WhatsApp templates | Medium | Push-only / `fake` providers until registered (ADR-011) | Ops |
| Live GSTIN on invoices | Medium | Env empty → `pending registration` until finance fills `INVOICE_GSTIN` | Finance |
