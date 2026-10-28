# Incidents List Page

## Overview

This route serves `/manage/app/incidents`. It lists the open incidents and links to the incident editor. An incident is an outage report in the `incidents` table. The page has no `load` function. It reads through the manage API: the `POST /manage/api` endpoint, which checks a permission for each action.

## Interface

- The page sends `getIncidents` (permission `incidents.read`) with `page`, `limit`, and `filter: { status: "OPEN", state }`.
- The table shows the id, the title, the start time, the duration, the state, and the affected monitors with their impact.
- The page links to `/manage/app/incidents/new` and `/manage/app/incidents/{id}`.
- [[incident_id]](<./[incident_id]/EGM.md>): the incident editor. The value `new` opens create mode.

## Invariants

- The layout guard in `src/routes/(manage)/+layout.server.ts` lets only users with `incidents.read` open this route.
- The page size is 10.
- The page always sends `status` `OPEN`. The user cannot change it.
- The state filter is `ALL`, `INVESTIGATING`, `IDENTIFIED`, `MONITORING`, or `RESOLVED`. `ALL` sends no `state`. A change of filter goes back to page 1.
- The duration is the time since the start when `end_date_time` is missing.
- The page writes no data.

## Side Effects

- The page only reads. A failed load only logs to the console.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
