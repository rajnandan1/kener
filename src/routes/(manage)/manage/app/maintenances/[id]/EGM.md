# Maintenance Editor

## Overview

This route serves `/manage/app/maintenances/[id]`. It creates, edits, and deletes one maintenance. A maintenance is planned downtime in the `maintenances` table. Its schedule is an RRULE (a recurrence rule in the iCalendar format) plus a duration. Each time the rule fires, the server makes a maintenance event in `maintenances_events`. The page has no `load` function. It reads and writes through the manage API: the `POST /manage/api` endpoint, which checks a permission for each action.

## Interface

- The param value `new` opens the editor in create mode.
- In edit mode, the page sends `getMaintenance` (permission `maintenances.read`) and reads the events from its `events` field. It sends `getMaintenanceEvents` (permission `maintenances.read`) only to refresh the events list after an event delete or status change.
- The page sends `getMonitors` (permission `monitors.read`) with `status: "ACTIVE"` to fill the monitor picker.
- Save sends `createMaintenance` in create mode and `updateMaintenance` in edit mode (permission `maintenances.write`). The affected monitors go in the same request.
- Delete sends `deleteMaintenance`. The events list sends `deleteMaintenanceEvent` and `updateMaintenanceEventStatus` (permission `maintenances.write`).
- The editor has a details card (title, global switch, duration, and the "Affected Monitors" picker) and a schedule card (one-time or RRULE, with a preview of the next 5 dates). Edit mode adds the "Active" and "Inactive" status buttons and the events list.

## Invariants

- The layout guard in `src/routes/(manage)/+layout.server.ts` lets only users with `maintenances.read` open this route.
- Save needs a title, a start time, and a duration above 0. A recurring schedule also needs an RRULE that `rrulestr` can parse.
- The page saves a one-time schedule as the RRULE `FREQ=MINUTELY;COUNT=1`.
- On load, the page treats any RRULE that contains the text `COUNT=1` as one-time. This match also catches `COUNT=10` through `COUNT=19` and `COUNT=100`. When the user saves such a rule, the page replaces it with `FREQ=MINUTELY;COUNT=1`.
- `duration_seconds` is hours times 3600 plus minutes times 60. The inputs allow 0 through 72 hours and 0 through 59 minutes.
- Timestamps are Unix seconds. The page reads the `datetime-local` inputs in the browser's time zone.
- The create defaults are a start one hour from now, a duration of 3600 seconds, and `is_global` `YES`.
- Monitor impact is `UP`, `DOWN`, `DEGRADED`, or `MAINTENANCE`, and the default is `MAINTENANCE`.
- The page offers Complete only for an `ONGOING` event. It offers Cancel for a `SCHEDULED`, `READY`, or `ONGOING` event.
- Both deletes need a `window.confirm`. The maintenance delete warns that it also deletes all events.
- Complete and Cancel open a confirmation dialog. The dialog's confirm button sends `updateMaintenanceEventStatus` with `COMPLETED` or `CANCELLED`.

## Side Effects

- The actions write `maintenances`, `maintenance_monitors`, and `maintenances_events`.
- After a create, the page calls `goto("/manage/app/maintenances/{id}")`. After a delete, it calls `goto("/manage/app/maintenances")`.
- The `rrule` package parses the RRULE in the browser.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
