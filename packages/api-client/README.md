# @caratom/api-client

Typed fetch wrapper for CARATOM clients. Phase 01 exposes `getHealth()` and `getMe()`.

## Usage

```ts
import { ApiClient } from '@caratom/api-client';

const client = new ApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000',
  getAccessToken: async () => null,
});

const health = await client.getHealth();
```

Every request sets `X-Request-Id` via `globalThis.crypto.randomUUID()`. Expo SDK 52 / modern browsers provide this. If a runtime lacks it, the client falls back to a UUID v4-shaped string.

On non-2xx responses the client parses Problem Details JSON when present and throws `ApiError`.
