# cache

## Overview

This folder holds a small JSON cache in Redis. Kener uses it to read a monitor's last monitoring value and last heartbeat without a database query. `GetStatusCountsByIntervalGroupedByMonitor` in `src/lib/server/controllers/monitorsController.ts` also caches its status counts for 60 seconds under the key `status_counts_grouped:<sorted tags>:<start>:<interval>:<points>`. Redis is shared by every Kener process that uses the same `REDIS_URL`, so the cache is not local to one process.

## Interface

- `cache.ts` exports `setCache<T>(key, value, ttlSeconds?)`. The function stores `JSON.stringify(value ?? null)` under the key `kener:cache:<key>` with an expiry.
- `cache.ts` exports `getCache<T>(key, fetcher?, ttlSeconds?)`. On a hit, it returns the parsed value. On a miss, it calls `fetcher` when one is given, stores the result with `setCache`, and returns it. On a miss with no `fetcher`, it returns `null`.
- `cache.ts` exports `deleteCache(key)`, which deletes `kener:cache:<key>`.
- `setGet.ts` exports `SetLastMonitoringValue(tag, value)` and `GetLastMonitoringValue(tag, fetcher?)`. They use the key `<tag>:last_status` with a TTL of 86400 seconds (1 day).
- `setGet.ts` exports `SetLastHeartbeat(tag, timestamp)` and `GetLastHeartbeat(tag)`. They use the key `last_heartbeat:<tag>` with a TTL of 45 days, and the value is `{ timestamp }`.
- `setGet.ts` exports `DeleteMonitorCaches(tag)`, which deletes both keys of one monitor.

## Invariants

- Every TTL is in seconds. A missing TTL, or a TTL of 0 or less, becomes 300 seconds (`cache.ts:12`).
- `getCache` returns `null` when the stored value is not valid JSON. It does not delete the bad entry (`cache.ts:28-34`).
- `getCache` stores the fetcher result even when it is `null`, so a miss can cache `null` for the full TTL (`cache.ts:38-39`).
- The heartbeat entry stores milliseconds in old data and seconds in new data. `src/lib/server/services/heartbeatCall.ts` treats a value below 1e12 as seconds.
- A change to a key format orphans the old entries until they expire. `DeleteMonitorCaches` must list every per-monitor key, because `src/lib/server/controllers/monitorsController.ts` calls it when it deletes a monitor.

## Side Effects

- Each function reads or writes Redis through `redisIOConnection()` from `src/lib/server/redisConnector.ts`. That function throws when `REDIS_URL` is not set.
- `src/lib/server/queues/monitorResponseQueue.ts` writes the last monitoring value after each check. `UpdateMonitoringData` in `monitorsController.ts` also writes it after a manual data change. `monitorsController.ts`, `src/lib/server/services/groupCall.ts`, and `src/routes/(kener)/badge/[tag]/dot/+server.ts` read it. `src/lib/server/services/heartbeatCall.ts` reads only the last heartbeat.
- `RegisterHeartbeat` in `monitorsController.ts` is the only caller of `SetLastHeartbeat`.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this folder directly. Several tests mock `$lib/server/cache/cache`.
