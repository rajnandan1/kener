# Live Events Embed (`/embed/events/live`)

## Overview

This route serves `/embed/events/live`, a page that other sites put in an iframe. It shows the ongoing incidents and the ongoing maintenance events of a Kener site. The `(embed)` layout supplies the theme colors, the font, and the locale.

## Interface

- `+page.server.ts` exports `load`. It returns `{ theme, incidents, maintenance_events }`.
- `load` reads these query parameters:
    - `theme`: The value `dark` sets dark mode. Any other value sets light mode. When `theme` is absent, the page keeps the site default.
    - `incidents`: The value `1` shows incidents. Any other value hides them.
    - `maintenance`: The value `1` shows maintenance events. Any other value hides them.
    - `tags`: This is a comma-separated list of monitor tags (the unique ID of each monitor). Each tag is trimmed.
- `load` calls `db.getAllGlobalOngoingIncidentsWithComments(ts, tags)` and `db.getAllGlobalOngoingMaintenanceEvents(ts, tags)` from `$lib/server/db/db`, with `ts` from `GetNowTimestampUTC`.
- `+page.svelte` renders each incident with `IncidentItem` (with `showComments={false}`) and each maintenance event with `MaintenanceItem`, both from `$lib/components/`.

## Invariants

- When both `incidents` and `maintenance` are absent, the page shows both kinds of event. When only one of them is present, the other one is off.
- `load` skips the database query for a kind of event that is off and returns an empty array for it.
- With no `tags`, the queries return only global events (`incidents.is_global = 'YES'` and `maintenances.is_global = 'YES'`).
- With `tags`, the queries return the events of those monitors and exclude hidden monitors (`monitors.is_hidden = 'NO'`).
- An unknown tag gives empty lists. `load` does not catch database errors, so a failed query throws out of `load`.
- When both lists are empty, the page shows the translated text "There are no ongoing incidents or maintenance events."
- The route does no auth or permission check.

## Side Effects

- `load` runs read-only queries on the tables `incidents`, `incident_monitors`, `incident_comments`, `monitors`, `maintenances`, `maintenances_events`, and `maintenance_monitors`.
- On mount, `+page.svelte` calls `setMode` from `mode-watcher` when `theme` is set, which changes the stored color mode in the browser.

## Verification

- Run: `npm run check` (svelte-kit sync and svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
- The route reads the database, so a change must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
