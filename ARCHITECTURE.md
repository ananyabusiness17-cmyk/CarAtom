# CARATOM architecture

Status: canonical entry point.

CARATOM is a doorstep automotive-service operating system with three clients:

- a customer mobile app;
- a technician mobile app; and
- an admin web control plane.

All future implementation must begin with the documents in [`docs/architecture`](docs/architecture/00-overview.md). The architecture directory supersedes the former single-file specification and the historical `POSSIBLE ARCHITECTURE.MD` draft.

## Read in this order

1. [`00-overview.md`](docs/architecture/00-overview.md)
2. [`01-product-constitution.md`](docs/architecture/01-product-constitution.md)
3. [`02-product-flows.md`](docs/architecture/02-product-flows.md)
4. [`03-domain-model.md`](docs/architecture/03-domain-model.md)
5. [`04-state-machines.md`](docs/architecture/04-state-machines.md)
6. [`05-technical-architecture.md`](docs/architecture/05-technical-architecture.md)
7. [`06-frontend-architecture.md`](docs/architecture/06-frontend-architecture.md)
8. [`07-backend-architecture.md`](docs/architecture/07-backend-architecture.md)
9. [`08-data-model.md`](docs/architecture/08-data-model.md)
10. [`09-api-contracts.md`](docs/architecture/09-api-contracts.md)
11. [`10-design-system.md`](docs/architecture/10-design-system.md)
12. [`11-screen-specifications.md`](docs/architecture/11-screen-specifications.md)
13. [`12-component-architecture.md`](docs/architecture/12-component-architecture.md)
14. [`13-error-recovery.md`](docs/architecture/13-error-recovery.md)
15. [`14-security.md`](docs/architecture/14-security.md)
16. [`15-testing-strategy.md`](docs/architecture/15-testing-strategy.md)
17. [`16-analytics.md`](docs/architecture/16-analytics.md)
18. [`17-performance.md`](docs/architecture/17-performance.md)
19. [`18-implementation-roadmap.md`](docs/architecture/18-implementation-roadmap.md)
20. [`19-open-questions.md`](docs/architecture/19-open-questions.md)

## The three canonical customer routes

```text
General Service without add-ons
Service -> Job card -> Estimate -> Accept -> Details -> Vehicle -> Slot -> Confirm

General Service with add-ons
Service -> Job card -> Add-ons -> Estimate -> Accept -> Advisor confirmation
-> Re-accept if changed -> Details -> Vehicle -> Slot -> Confirm

One-man Job
Service -> Service detail -> Details -> Vehicle -> Slot -> Confirm -> Visit -> Invoice

Direct Special Service
Service -> Service detail -> Details -> Vehicle -> Slot -> Confirm
```

Inspection-and-repair remains a separate two-visit operational offering. It must not be confused with a customer adding a catalogued repair to General Service.

## Immediate build rule

Do not start by making isolated screens. Implement the vertical slices in the roadmap, with server-owned flow policy, estimate calculation, lifecycle transitions, and slot allocation.
