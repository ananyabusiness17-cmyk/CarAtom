# 17 — Performance architecture

## Targets

Initial targets are practical budgets, measured on representative mid-range Android and current iPhone hardware:

- cold app launch to usable Home: under 2.5 seconds with warm API/cache;
- service detail navigation: under 300 ms after cached catalog;
- first catalog content: under 1.5 seconds on a good mobile connection;
- API read p95: under 500 ms for normal catalog/job reads;
- pricing command p95: under 1.5 seconds excluding provider calls;
- slot query p95: under 1.5 seconds;
- booking confirmation p95: under 2 seconds excluding client network variance.

Measure before tightening budgets.

## Client performance

- Cache catalog and profile with TanStack Query and stale times appropriate to admin edits.
- Paginate search, orders, inventory, and job boards.
- Use FlashList for long lists.
- Resize images and request appropriate dimensions; lazy-load below fold.
- Avoid rendering hidden tabs and large media simultaneously.
- Debounce search/pricing inputs and cancel obsolete requests.
- Keep local draft writes debounced and bounded.
- Use skeletons for stable layout, not spinners everywhere.

## Backend performance

- Index active catalog, job status/customer, advisor queue, slot/visit overlap, payment, inventory, and outbox queries.
- Select only fields needed for mobile read models.
- Keep pricing deterministic and local; do not call external providers during ordinary estimate calculation.
- Use database transactions and locks only around critical booking/inventory/payment operations.
- Workers handle notifications, media processing, and reminders asynchronously.
- Redis caches safe catalog/availability hints but cannot be source of truth.

## Media and maps

Use thumbnail/full-size variants, signed URLs with bounded expiry, upload compression, and map tiles that degrade gracefully. Do not load a map for every ordinary service screen.

## Observability

Measure endpoint latency, DB query time, queue age, upload failure, cache hit rate, app startup, screen transition, slot hold conflicts, payment verification lag, and crash-free sessions. Performance regressions are investigated with request IDs and app versions.

