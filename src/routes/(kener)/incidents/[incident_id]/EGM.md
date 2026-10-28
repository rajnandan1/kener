# Incident Page

## Overview

This route serves `/incidents/{incident_id}`. It shows one incident: its title, its updates (the incident comments), and the monitors it affects. The `(kener)` route group adds no URL segment.

## Interface

- `+page.server.ts` exports `load`. It returns `{ incident, comments, affectedMonitors }`.
- `load` calls three functions from `src/lib/server/controllers/dashboardController.ts`:
    - `GetIncidentById(id)` reads one row of the `incidents` table.
    - `GetIncidentCommentsByIncidentId(id)` reads the `incident_comments` rows with `status = "ACTIVE"`, newest first.
    - `GetAffectedMonitorsByIncidentId(id, canSeeHiddenMonitors)` joins `incident_monitors` to `monitors`. It adds `monitors.is_hidden = "NO"` unless the second argument is true.
- `load` throws 400 `Invalid incident ID` when `Number(incident_id)` is `NaN`. It throws 404 `Incident not found` when no row exists.
- The route has no form actions.
- `+page.svelte` shows the updates as Markdown through `SveltePurify(mdToHTML(...))` and lists the affected monitors with links to `/monitors/{monitor_tag}`. It makes no fetch requests. `mdToHTML` is in `src/lib/marked.ts`.

## Invariants

- `load` reads `canSeeHiddenMonitors` from `parent()` (the layout data) and must pass it to `GetAffectedMonitorsByIncidentId`. The value is true only for a signed-in user with the `monitors.read` permission.
- The route checks visibility only on the monitor list. It serves any incident by id, whatever its `status` or `state`, also when all its monitors are hidden.
- The page uses the newest comment as the page description, so the comment order sets the link preview text.
- User Markdown must go through `SveltePurify`, which removes unsafe HTML.

## Side Effects

- `load` reads the `incidents`, `incident_comments`, `incident_monitors`, and `monitors` tables. It writes nothing.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm run test:server -- "src/routes/(kener)/hidden-monitors.test.ts"`. This test checks that this page hides hidden monitors. No test file is in this directory.
- The code reads the database, so a change must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
