# Group Monitor Cache Flow

## Overview

Group monitors aggregate the status of child monitors using weighted scores. The execution involves a cache layer (Redis) that must stay in sync with the database for correct status propagation.

## Execution Flow

1. **Cron fires** → `appScheduler` schedules each monitor via BullMQ job scheduler (`monitorSchedulers.ts`)
2. **Worker calls** `Minuter(monitor)` in `cron-minute.ts`
3. For GROUP monitors, `Minuter` adds a BullMQ **delay** of `executionDelay` ms so child monitors finish first
4. **`monitorExecuteQueue`** worker calls `Service.execute()` → `GroupCall.execute()`
5. `GroupCall.execute()` reads each child's latest status from **Redis cache** via `GetLastMonitoringValue(tag, fetcher)`

## Cache Behaviour

- **Key format:** `kener:cache:{tag}:last_status`
- **TTL:** 86400 seconds (1 day)
- `getCache()` returns cached value if present — **fetcher is only called on cache miss**
- Cache is updated in two places:
  - `monitorResponseQueue.ts` — after cron-driven monitor execution completes
  - API PATCH endpoints (`api/v4/monitors/[tag]/data/`) — after external status updates

## Key Invariant

Any code path that writes monitoring data to the DB **must** also update the `last_status` cache entry. Otherwise `GroupCall` (and other cache consumers like badge endpoints) will serve stale data.

## `executionDelay` Purpose

`executionDelay` is NOT used inside `groupCall.ts`. It is applied in `cron-minute.ts` as BullMQ's `delay` option, deferring the group job so child monitors have time to complete and update the cache before the group aggregates.

## Key Files

- `src/lib/server/services/groupCall.ts` — weighted status aggregation
- `src/lib/server/cron-minute.ts` — applies `executionDelay` as BullMQ delay
- `src/lib/server/cache/setGet.ts` — `SetLastMonitoringValue` / `GetLastMonitoringValue`
- `src/lib/server/queues/monitorResponseQueue.ts` — cache update after cron execution
- `src/routes/(api)/api/v4/monitors/[monitor_tag]/data/+server.ts` — range update API
- `src/routes/(api)/api/v4/monitors/[monitor_tag]/data/[timestamp]/+server.ts` — single-point update API
