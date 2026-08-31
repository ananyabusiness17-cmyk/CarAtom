# RUNBOOK — Rollback

Prefer **forward fix**. Railway service rollback is safer than Alembic downgrade.

## API / admin (Railway)

1. Identify last good deployment in Railway → the failing service
2. Rollback **api** first if the contract broke clients; rollback **admin** if UI-only
3. Worker: rollback after API if the worker image must match schema
4. Run `node scripts/release/prod-smoke.mjs`
5. If health fails, keep the previous image; do not migrate further

Do not force-push `main`.

## Alembic

Downgrade only if a tested downgrade revision exists **and** a backup was taken.

```powershell
cd backend
uv run alembic current
# Only if the release notes name a downgrade target:
# uv run alembic downgrade <revision>
```

If the migration is data-destructive: **restore from backup** ([RUNBOOK-backup-restore.md](./RUNBOOK-backup-restore.md)) instead of downgrade.

## EAS Update (JS)

See [RUNBOOK-eas-update-rollback.md](./RUNBOOK-eas-update-rollback.md).

## Store binary

Customer native rollback is a new store build + phased Play rollout halt. Technician/admin-mobile: ship a new **internal** build; never public store.

## Staging simulation

| Date | What rolled back | Result |
|------|------------------|--------|
| | api image on staging | pending |
