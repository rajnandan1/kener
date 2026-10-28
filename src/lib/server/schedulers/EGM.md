# schedulers

## Overview

This folder runs Kener's recurring work with BullMQ job schedulers. A job scheduler is a BullMQ record in Redis that adds a job on a cron pattern or a fixed interval. The schedulers keep one cron job per active monitor in step with the database, create the events of recurring maintenances, and delete old monitoring rows each day. `src/lib/server/startup.ts` starts them, and `scripts/main.ts` shuts them down on `SIGTERM` and `SIGINT`.

## Interface

- `appScheduler.ts` exports `start(options?)` and `shutdown()`. `start` upserts the scheduler `mainJob_main_job` on the queue `appSchedulerQueue` with `every: 10000` (10 seconds). Each run syncs the monitor schedulers and calls `UpdateMaintenanceEventStatuses()`.
- `monitorSchedulers.ts` exports `addJobToSchedulerQueue(minNumOfWorkers, monitor, id, options?)`, `removeJobFromSchedulerQueue(id, minNumOfWorkers)`, `getSchedulers(minNumOfWorkers)`, and `shutdown()`. They manage one scheduler per monitor on the queue `monitorScheduleQueue`, with `pattern: monitor.cron` and `immediately: true`. Its worker calls `Minuter(monitor)` from `src/lib/server/cron-minute.ts` for each job.
- `maintenanceScheduler.ts` exports `start(options?)` and a default object `{ start, shutdown }`. `start` upserts `maintenanceSchedulerJob_hourly` on `maintenanceSchedulerQueue` with `every: 3600000` (1 hour) and `immediately: true`.
- `dailyCleanup.ts` exports `start(options?)` and `shutdown()`. `start` upserts `dailyCleanupJob_midnight_utc` on `dailyCleanupQueue` with the cron pattern `0 0 * * *` and no time zone. The job runs at midnight in the process time zone, which is 00:00 UTC when `TZ=UTC`.
- `shutdown.ts` default-exports a function that closes the workers of the app, monitor, maintenance, and daily cleanup schedulers, in that order.

## Invariants

- The app scheduler schedules only monitors that `GetMonitorsParsed({ status: "ACTIVE" })` returns and that have a `cron` (`appScheduler.ts:29`, `appScheduler.ts:67`). `addJobToSchedulerQueue` throws `Monitor cron expression is undefined` for a monitor with no `cron`.
- Each monitor scheduler id is `monitor.tag + "::" + HashString(JSON.stringify(monitor))` (`appScheduler.ts:31`). Any change to a monitor's record gives a new id. The sync then removes the old scheduler and adds a new one, so a re-run is idempotent.
- The monitor worker takes its `concurrency` from the active monitor count on its first creation only (`monitorSchedulers.ts:25-34`). Later changes to the count do not change it.
- `monitorSchedulers.ts` `shutdown()` closes the worker but does not set it to `null`. A later `addJobToSchedulerQueue` in the same process therefore does not create a new worker.
- The maintenance scheduler skips maintenances whose `rrule` contains `COUNT=1`, because `src/lib/server/controllers/maintenanceController.ts` creates one-time events when the maintenance is created. It creates events only from now to 7 days ahead, and only when no event of that maintenance has the same `start_date_time`. It reads at most 1000 active maintenances per run.
- Maintenance times are Unix seconds. An event ends at `start_date_time + duration_seconds`.
- The daily cleanup reads the site setting `dataRetentionPolicy`. When the setting is missing or bad, it uses `{ enabled: true, retentionDays: 90 }`. It clamps `retentionDays` to at least 1 and skips the delete when `enabled` is false.
- The shutdown functions close workers only. They do not remove schedulers or close queues, so the schedulers stay in Redis across restarts.

## Side Effects

- All files create queues and workers through `createQueue` and `createWorker` in `src/lib/server/queues/q.ts`. The jobs live in Redis under the `kener` prefix.
- The app scheduler reads monitors every 10 seconds, adds and removes monitor schedulers, and logs `ADDING NEW SCHEDULER` and `REMOVING INACTIVE SCHEDULER` lines.
- Each app scheduler run calls `UpdateMaintenanceEventStatuses`, which writes maintenance event statuses and can push `subscriberQueue` jobs that notify subscribers.
- Each monitor job calls `Minuter`, which adds a job to `monitorExecuteQueue`.
- The maintenance scheduler reads `db.getMaintenancesPaginated` and `db.getMaintenanceEventsByMaintenanceId`. It writes new events through `CreateMaintenanceEventWithNotification`, which can notify subscribers.
- The daily cleanup calls `db.background(retentionDays)`, which deletes `monitoring_data` rows older than the retention window.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this folder directly.
- The jobs read and write the database, so a change must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
