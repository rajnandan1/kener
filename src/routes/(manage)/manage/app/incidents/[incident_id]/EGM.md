# Incident Editor

## Overview

This route serves `/manage/app/incidents/[incident_id]`. It creates, edits, and deletes one incident. An incident is an outage report in the `incidents` table. It lists the affected monitors, each with an impact, and a timeline of updates (comments in `incident_comments`). The page has no `load` function. It reads and writes through the manage API: the `POST /manage/api` endpoint, which checks a permission for each action.

## Interface

- The param value `new` opens the editor in create mode.
- In edit mode, the page sends `getIncident` and `getComments` (permission `incidents.read`). It sends `getIncidents` with `{ page: 1, limit: 100, filter: { status: "ALL" } }` and finds the incident in that one page to read the impact of each affected monitor. An incident outside the 100 newest by `id` loads with an empty monitor list.
- The page sends `getMonitors` (permission `monitors.read`) with `status: "ACTIVE"` to fill the monitor picker.
- Save sends `createIncident` in create mode and `updateIncident` in edit mode (permission `incidents.write`).
- On save, the page sends `addMonitor` for each added monitor or changed impact, and `removeMonitor` for each removed monitor (permission `incidents.write`).
- The updates card sends `addComment`, `updateComment`, and `deleteComment` (permission `incidents.write`).
- Delete sends `deleteIncident` (permission `incidents.write`).
- The editor has a details card (title, start time, and the global switch), a monitors list, and an updates card. Create mode shows an optional first update instead of the updates card.

## Invariants

- The layout guard in `src/routes/(manage)/+layout.server.ts` lets only users with `incidents.read` open this route.
- Save needs a title and a start time.
- Timestamps are Unix seconds. The page reads the `datetime-local` inputs in the browser's time zone.
- `createIncident` always sends `status` `OPEN`, `state` `INVESTIGATING`, `incident_type` `INCIDENT`, and `end_date_time` `null`. `updateIncident` sends `status` `OPEN` and does not send `state`.
- The update state is `INVESTIGATING`, `IDENTIFIED`, `MONITORING`, or `RESOLVED`. Each update carries its own state.
- Monitor impact is `DOWN` or `DEGRADED`, and the default is `DOWN`. `is_global` is `YES` or `NO`, and the default is `YES`.
- Monitor changes stay in the browser until Save. Save compares them with the loaded list. The functions `addMonitorToIncident` and `removeMonitorFromIncident` exist in the file, but the markup does not call them.
- Delete runs only when the user types `delete incident {incident_id}` exactly. `deleteComment` runs with no confirmation.

## Side Effects

- The actions write `incidents`, `incident_monitors`, and `incident_comments`.
- After a create, the page calls `goto("/manage/app/incidents/{id}")`.
- After a delete, the page calls `window.location.replace` on `/manage/app/incidents`. This is a full page load, not `goto`.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
