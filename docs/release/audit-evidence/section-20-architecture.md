# §20 Architecture conformance (code)

| Rule | Pass | Notes |
|------|------|-------|
| Server-authoritative money | [x] | Razorpay order server-side; webhook HMAC |
| No client PostgREST financial writes | [x] | API only |
| Separate state machines | [x] | override tests |
| Technician cannot set selling prices | [x] | no tech price PATCH |
| Admin override + audit | [x] | audit_logs |
| UTC storage IST display | [x] | invoice PDF IST |
| Outbox worker only messaging | [x] | ADR-011 |
| Request ID | [x] | middleware |
| Admin web dense ops | [x] | Phase 09 |
| Customer public stores only | [ ] config | eas production store; listing BLOCKED |
| Tech/admin private | [x] | internal distribution in eas.json |
| FastAPI + Railway + Supabase | [x] | Dockerfiles + notes; deploy BLOCKED |
| Razorpay India | [x] code | live mode BLOCKED |
| Light-blue accent | [x] | tokens `#5DB7E8` / `#176B9E` |

Gate: live rows remain open until operator cutover. Code rows pass.
