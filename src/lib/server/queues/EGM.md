# queues

## Overview

This folder holds Kener's background job pipeline on BullMQ, a Redis-backed job queue library. A monitor check flows through three queues: `monitorExecuteQueue` runs the check, `monitorResponseQueue` saves the result, and `alertingQueue` evaluates alert configs. Subscriber emails flow through `subscriberQueue` and then `emailQueue`. `q.ts` is the one factory that every queue and every scheduler in `src/lib/server/schedulers/` uses.

## Interface

- `q.ts` exports `createQueue(name, options?)` and `createWorker(queue, processor, options?)`.
- `monitorExecuteQueue.ts` exports `push(monitor, ts, options?)` and `shutdown()`. A job runs `new Service(monitor).execute(ts)` from `src/lib/server/services/service.ts`. It merges the result with the default status and with any active incident or maintenance overlay, then pushes each merged minute to `monitorResponseQueue`. An overlay is the status that an ongoing incident or maintenance forces on a monitor for that minute.
- `monitorResponseQueue.ts` exports `push(monitorTag, ts, result, options?)` and `shutdown()`. A job saves the row with `InsertMonitoringData`, updates the Redis last value with `SetLastMonitoringValue`, and pushes to `alertingQueue`.
- `alertingQueue.ts` exports `push(monitor_tag, ts, status, options?)` and `shutdown()`. `monitorResponseQueue` and `UpdateMonitoringData` in `src/lib/server/controllers/monitorsController.ts` call `push`. `push` adds one job per active alert config of the monitor. A job decides whether the alert triggers or resolves, creates or closes the linked incident, and sends the alert through each trigger: email, webhook, Discord, or Slack.
- `subscriberQueue.ts` exports `push(variables, options?)` and `shutdown()`. A job loads the `subscription_update` template and the active subscriber emails for `variables.event_type`, then pushes one `emailQueue` job per recipient. `src/lib/server/controllers/incidentController.ts` and `maintenanceController.ts` call `push`.
- `emailQueue.ts` exports the type `EmailJobData`, `push(jobData, options?)`, and `shutdown()`. A job calls `sendEmail` from `src/lib/server/notification/email_notification.ts`.
- `shutdown.ts` default-exports a function that closes the workers of the execute, response, alerting, subscriber, and email queues, in that order. `scripts/main.ts` calls it on `SIGTERM` and `SIGINT`, after it shuts down the schedulers.

## Invariants

- `q.ts` sets the prefix `kener` on every queue and worker. It replaces any caller `defaultJobOptions` with `attempts: 3`, exponential backoff from 5000 ms, `removeOnComplete: true`, and `removeOnFail: false` (`q.ts:19-28`). Each `push` in this folder overrides both removal options on its job: completed jobs stay up to 3600 seconds and 1000 jobs in `monitorExecuteQueue`, and up to 300 seconds and 100 jobs in the other four queues. Failed jobs stay up to 24 hours. Workers run with `concurrency: 5` unless the caller passes another value.
- `createWorker` wraps every function processor in `db.runInWorkerContext`, so job queries use the worker connection pool and not the pool that serves web requests (`q.ts:44-51`). Keep all background work behind this factory.
- Each module creates its worker on the first `push` call. A process that never calls `push` does not consume that queue.
- `monitorExecuteQueue` and `monitorResponseQueue` deduplicate on `<tag>-<ts>`, so one monitor gets at most one job per minute. `alertingQueue` deduplicates on `<tag>-<ts>-<configId>`. `ts` is the start of the minute in Unix seconds.
- `subscriberQueue` and `emailQueue` fall back to a dedup id that ends in `Date.now()`, which never deduplicates. A caller that needs one notification per event must pass its own id, as `incidentController.ts` does with `subscriber-incidents-<comment.id>`.
- The execute job reads overlays for the job's `ts`, not the current time, so a delayed or retried job stays aligned. It merges in the order default, realtime, incident, maintenance, and the later source wins. When the check returns `NO_DATA` and the monitor has a default status, the job swaps in the default status (type `DEFAULT`) before the merge, so an incident or maintenance overlay can still override it.
- The execute job applies the confirmation threshold only when `confirmation_threshold` is above 1, the check type is `REALTIME`, `TIMEOUT`, or `ERROR`, and no overlay is active (`monitorExecuteQueue.ts:142-147`). The threshold is the number of checks in a row that must agree before the status flips.
- The response job throws when `InsertMonitoringData` fails, so BullMQ retries it. The alerting job catches and logs the errors inside its `try` block, so they cause no retry. `GetAllSiteData` and `siteDataToVariables` run before that block, so an error there makes BullMQ retry the job.
- Alerts must not notify subscribers. Only incident comments do that, through `incidentController.ts`. Otherwise an alert-driven incident notifies subscribers twice.

## Side Effects

- Every queue and worker opens a Redis connection through `redisIOConnection()`, which reads `REDIS_URL`.
- The execute job runs the network check of the monitor type and reads `db.getIncidentsByMonitorTagRealtime` and `db.getMaintenancesByMonitorTagRealtime`.
- The response job writes `monitoring_data` and the Redis key `kener:cache:<tag>:last_status`.
- The alerting job writes alerts and incidents through `CreateMonitorAlertV2`, `UpdateMonitorAlertV2Status`, `CreateNewIncidentWithCommentAndMonitor`, and `AddIncidentComment`. It sends HTTP requests and emails through `sendEmail`, `sendWebhook`, `sendDiscord`, and `sendSlack`.
- The subscriber and email jobs send one email per subscriber and log failures with `console.error`.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test file sits in this folder. `src/routes/(kener)/hidden-monitors.test.ts` mocks `subscriberQueue.push` to check subscriber emails.
- The jobs read and write the database, so a change must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
