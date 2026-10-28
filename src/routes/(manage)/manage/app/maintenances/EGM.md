# Maintenances List Page

## Overview

This route serves `/manage/app/maintenances`. It lists the maintenances and links to the maintenance editor. A maintenance is planned downtime in the `maintenances` table, scheduled by an RRULE (a recurrence rule in the iCalendar format). The page has no `load` function. It reads through the manage API: the `POST /manage/api` endpoint, which checks a permission for each action.

## Interface

- The page sends `getMaintenances` (permission `maintenances.read`) with `page`, `limit`, and `filter: { status }`.
- The table shows the id, the title, the type, the duration, the monitors, the next event, and the status.
- The page links to `/manage/app/maintenances/new` and `/manage/app/maintenances/{id}`.
- [[id]](<./[id]/EGM.md>): the maintenance editor with its schedule and events. The value `new` opens create mode.

## Invariants

- The layout guard in `src/routes/(manage)/+layout.server.ts` lets only users with `maintenances.read` open this route.
- The page size is 10, and the server does the paging.
- The status filter is `ALL`, `ACTIVE`, or `INACTIVE`, and the default is `ACTIVE`. `ALL` sends no `status`. A change of filter goes back to page 1.
- The page shows the type One-Time when the RRULE contains `COUNT=1`, and Recurring otherwise. The editor in `./[id]/` uses the same text match.
- The next event column reads `upcoming_event` and shows Ongoing, In X, Completed, or Scheduled.
- The page writes no data.

## Side Effects

- The page only reads. A failed load only logs to the console.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
