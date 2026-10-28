# types

## Overview

This folder holds the TypeScript types that server code, browser code, and the `/api/v4` routes share. Almost every export is type-only. About 65 files import from `$lib/types/`.

## Interface

- `index.ts` re-exports `api.ts`, `monitor.ts`, `result.ts`, `common.ts`, and `status.ts`. Import the other files (`docker.ts`, `docs.ts`, `docs-search.ts`, `notifications.ts`, `ping.ts`, `site.ts`, `tcp.ts`) by their own path.
- `api.ts` holds the request and response types of the HTTP API, also called DTOs (data transfer objects). They cover status, site data, monitors, monitoring data, incidents, comments, maintenances, maintenance events, pages, and images. Examples are `ApiResponse<T>`, `ApiError`, `CreateMonitorRequest`, `GetIncidentsListResponse`, `PageSettings`, and `PageSettingsPatch`.
- `monitor.ts` holds `MonitorTag`, `MonitorStatus`, `MONITOR_TYPES`, `MonitorType`, `Monitor`, `MonitorPublicView`, `DayWiseStatus`, `NumberWithChange`, and `IncidentTypeSummary`.
- `status.ts` holds `MonitoringStatus` and `StatusType`.
- `result.ts` holds `Result`, `Ok`, `Err`, and the constructor functions `ok()` and `err()`.
- `common.ts` holds `PaginationInput`, `MonitorTableUptime`, and `MonitorTableRow`.
- `ping.ts`, `tcp.ts`, and `docker.ts` hold the `type_data` shapes of PING, TCP, and DOCKER monitors: `PingMonitorTypeData` (with `PING_HOST_TYPES`, `PingHostType`, and `PingHost`), `TcpMonitorTypeData` (with `TcpHost`), and `DockerMonitorTypeData` (with `DockerConnectionDefaults`).
- `site.ts` holds the types of the site settings, for example `SiteAnnouncement`, `SiteStatusColors`, `SiteI18nConfig`, `DataRetentionPolicy`, and `OidcSettings`.
- `notifications.ts` holds `NotificationEvent`.
- `docs.ts` and `docs-search.ts` hold the types of the docs site and its search index, for example `DocsConfig`, `DocsPageData`, and `DocsSearchIndexData`.

## Invariants

- Only four exports are runtime values: the `as const` arrays `MONITOR_TYPES` and `PING_HOST_TYPES`, and the functions `ok` and `err`. All other exports are type-only.
- `MONITOR_TYPES` lists the 13 monitor types: `API`, `PING`, `TCP`, `DNS`, `NONE`, `GROUP`, `SSL`, `SQL`, `HEARTBEAT`, `GAMEDIG`, `GRPC`, `PROMETHEUS`, and `DOCKER`. `MonitorType` derives from it. `src/lib/server/cron-minute.ts` and `src/routes/(manage)/manage/app/monitors/[tag]/components/MonitorTypeCard.svelte` read the array at runtime. A new monitor type needs an entry here, a branch in `src/lib/server/services/service.ts`, and a change in each other file that `rg -il <type> src` finds.
- `MonitorStatus` (`monitor.ts`) and `StatusType` (`status.ts`) both resolve to `"UP" | "DOWN" | "DEGRADED" | "MAINTENANCE" | "NO_DATA"`. Neither type refers to the other, so change both together.
- `DayWiseStatus.status` uses the lowercase values `"up" | "degraded" | "down"`, unlike the other status unions.
- The monitor responses in `api.ts` (`GetMonitorsListResponse`, `GetMonitorResponse`, `CreateMonitorResponse`, and `UpdateMonitorResponse`) use `MonitorRecordTyped` from `src/lib/server/types/db.ts`. So a change to that database type also changes these `/api/v4` responses. `AGENTS.md` says to ask the maintainer before you change an `/api/v4` request or response shape.
- `monitor.ts`, `ping.ts`, `tcp.ts`, and `docker.ts` state that they are safe to import from both server and browser code. `api.ts` imports from `$lib/server` only with `import type`, so it loads no server code.
- Timestamps follow the Kener rule of UTC seconds. `Monitor.updatedAtUtc` and the `*_duration_seconds` fields are in seconds. The `timeout` field of `DockerMonitorTypeData` is in milliseconds.

## Side Effects

- None. At import time, the files only define the two arrays and the two functions.

## Verification

- Run `npm run check` (svelte-kit sync and the svelte-check type check). This is the main check for a type change.
- Run `npm test` (the full suite). No test covers this folder directly. For a change to an `/api/v4` type, also run `npm run test:server -- "src/routes/(api)"`.
