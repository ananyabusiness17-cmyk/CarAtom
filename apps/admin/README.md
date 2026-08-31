# CARATOM Admin

Next.js App Router shell for the operations web app. **Phase 01: shell only** — ops UI ships in Phase 09.

```powershell
pnpm --filter @caratom/admin dev
```

Opens at http://localhost:3000.

Copy `.env.example` to `.env.local`. Never put `SUPABASE_SERVICE_ROLE_KEY` in this app.

`next.config.ts` uses `output: 'standalone'` for a later Railway deploy (Phase 12).
