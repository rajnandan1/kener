# types

## Overview

This folder holds server-only TypeScript types: the database row shapes, the monitor check shapes, the JWT payload, and the `/dashboard-apis` handler contract. Server code imports them. Client code must not import them, as the header of `auth.ts` says.

## Interface

- `api-server.ts` exports `APIServerRequest` (`action`, `query: URLSearchParams`, `cookies`, `headers`, optional `body`) and `APIHandler`, a function that takes an `APIServerRequest` and returns a `Response`. Every handler in `src/lib/server/api-server/` has this type.
- `auth.ts` exports `TokenPayload`, the JWT payload of a user session. It extends `JwtPayload` from `jsonwebtoken` with `id`, `email`, `name`, and `role`.
- `monitor.ts` exports `MonitoringResult`, the result of one check: `status`, `latency`, `type`, and the optional `error_message`, `raw_status`, and SSL fields `expiry_at`, `issuer_cn`, `issuer_o`, and `cert_trusted`. `MonitoringResultTS` maps a timestamp to a `MonitoringResult`, and `src/lib/server/queues/monitorExecuteQueue.ts` uses it for its merge.
- `monitor.ts` exports one `type_data` shape per monitor type: `NoneMonitorTypeData`, `ApiMonitorTypeData`, `DnsMonitorTypeData`, `SslMonitorTypeData`, `SqlMonitorTypeData`, `HeartbeatMonitorTypeData`, `GroupMonitorTypeData`, `GamedigMonitorTypeData`, `GrpcMonitorTypeData`, and `PrometheusMonitorTypeData`. It re-exports the ping and TCP shapes (`PingHost`, `PingMonitorTypeData`, `TcpHost`, `TcpMonitorTypeData`) from `src/lib/types/`. It imports `DockerMonitorTypeData` from `src/lib/types/docker.ts` for its own use and does not export it.
- `monitor.ts` exports the generic `Monitor<T>` (`tag`, `type_data`, `cron`), one alias per type such as `ApiMonitor` and `DockerMonitor`, the union `MonitorTypeData`, and `EvalResponse`.
- `db.ts` exports one record type per table, usually with an `Insert` variant, for example `MonitorRecord`, `MonitoringData`, `IncidentRecord`, `MaintenanceRecord`, `PageRecord`, `UserRecord`, `ApiKeyRecord`, `MonitorAlertConfigRecord`, `MonitorAlertV2Record`, `SubscriberUserRecord`. The file has 119 exports in total. A comment banner names the table above each group, for example `// ============ monitoring_data table ============`.
- `db.ts` exports the string unions `AlertForType` (`STATUS`, `LATENCY`, `UPTIME`), `AlertSeverityType` (`CRITICAL`, `WARNING`), `YesNoType` (`YES`, `NO`), `MonitorAlertStatusType` (`TRIGGERED`, `RESOLVED`), `SubscriptionEventType` (`incidents`, `maintenances`), `SubscriptionStatus`, and `SubscriberUserStatus`.

## Invariants

- `DbTimestamp` (`Date | string`) types the audit columns `created_at` and `updated_at`. PostgreSQL and MySQL return a `Date`, and SQLite returns naive UTC text, so code must parse the value before use (`db.ts:5-6`).
- Event times are Unix seconds stored as numbers: `MonitoringData.timestamp`, `IncidentRecord.start_date_time` and `end_date_time`, and `MaintenanceRecord.start_date_time`. `MaintenanceRecord.duration_seconds` is in seconds.
- Several columns hold JSON as a string: `MonitorRecord.type_data`, `MonitorRecord.monitor_settings_json`, `SiteData.value`, and the template bodies `webhook_body`, `slack_body`, and `discord_body`. The `*Typed` variants, such as `MonitorRecordTyped`, hold the parsed form.
- Flag columns such as `MonitorRecord.is_hidden` and `IncidentRecord.is_global` hold the strings `YES` and `NO`, not booleans.
- `MonitoringData` lists the SSL fields only for the Redis `last_status` cache. They are not database columns (`db.ts:17-21`).
- `GroupMonitorMember.weight` values in one group must sum to 1, as the doc comment in `monitor.ts:86` says.
- `db.ts` declares `EmailTemplateJson`, `WebhookTemplateJson`, `SlackTemplateJson`, `DiscordTemplateJson`, `TriggerHeader`, and `TriggerMeta` twice, and `MaintenanceMonitorDetailRecord` twice. TypeScript merges the two declarations of each name, so a field added to one copy applies to both.

## Side Effects

- None. The four files declare only types and have no runtime code.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check). The type check is the only test for this folder.
