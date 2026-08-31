# RUNBOOK — Backup restore drill

**Gate:** complete once against a **scratch** project before launch traffic. Do not restore over production.

## Production policy (operator configures)

| Setting | Target |
|---------|--------|
| Region | `ap-south-1` (Mumbai) preferred |
| Backups | Daily; PITR if the Supabase plan allows |
| SSL | Required |
| Alembic | Direct URL only (not transaction pooler) |

## Drill

```text
1. Note production backup timestamp T0
2. Create a temporary Supabase project OR pg_restore into local Postgres 15
3. Count rows: job_cards, payments, profiles (expect small delta vs T0)
4. Read-only smoke: SELECT 1; catalog offerings count
5. Record duration and issues below (no PII)
6. Destroy the scratch instance
```

## Evidence

Store a **redacted** log in `audit-evidence/YYYYMMDD-backup-restore/` (timestamps, row counts, duration). Never commit dumps.

## Record

| Date | Duration | job_cards | payments | profiles | Issues |
|------|----------|-----------|----------|----------|--------|
| | pending | | | | Operator after prod project exists |
