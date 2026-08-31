# @caratom/contracts

Shared Zod schemas and TypeScript types for CARATOM API transport.

Phase 01 covers health, stub profile (`GET /v1/me`), and Problem Details errors. OpenAPI becomes authoritative in Phase 02; keep these schemas in sync with FastAPI response models until then.

```ts
import { HealthResponseSchema, MeResponseSchema } from '@caratom/contracts';
```
