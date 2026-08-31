# RUNBOOK — EAS Update rollback

Runtime version policy: **`appVersion`** (see each app `app.json` / `app.config.js`). A JS update only applies to binaries with the same runtime version.

## Ship a JS hotfix (customer, production channel)

```powershell
cd apps/customer
eas update --channel production --message "hotfix copy"
```

Native module or SDK change: full `eas build` + store submission (customer) or internal build (technician / admin-mobile).

## Rollback

```powershell
cd apps/customer
eas update:republish --group <previous-update-group-id>
```

Confirm on a TestFlight / internal device that the previous bundle loads. Do not republish a group from a different runtime version.

## Technician / admin-mobile

Use `--channel internal` or `--channel production` matching the private profile. Never submit these apps to public stores.

## Preview rehearsal (before production channel)

```powershell
cd apps/customer
eas update --channel preview --message "rollback drill"
# then republish the previous preview group
```

| Date | Channel | Result |
|------|---------|--------|
| | preview | pending — needs Expo account |
