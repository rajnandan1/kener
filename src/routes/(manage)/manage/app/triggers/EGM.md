# Triggers List Page

## Overview

This route serves `/manage/app/triggers`. It lists the triggers and links to the trigger editor. A trigger is a saved notification destination in the `triggers` table: a webhook, Discord, Slack, or email target. Alert configs send their alerts through triggers. The page has no `load` function. It reads through the manage API: the `POST /manage/api` endpoint, which checks a permission for each action.

## Interface

- The page sends `getTriggers` (permission `triggers.read`) with `status`. The request has no page or limit.
- The table shows the name, the type, and the status.
- The page links to `/manage/app/triggers/new` and `/manage/app/triggers/{id}`.
- [[trigger_id]](<./[trigger_id]/EGM.md>): the trigger editor. The value `new` opens create mode.

## Invariants

- The layout guard in `src/routes/(manage)/+layout.server.ts` lets only users with `triggers.read` open this route.
- The page loads every matching trigger and pages them in the browser, 10 per page.
- The status filter is `ALL`, `ACTIVE`, or `INACTIVE`, and the default is `ACTIVE`. `ALL` sends no `status`.
- `getTriggers` returns the URL and header values masked.
- The page writes no data.

## Side Effects

- The page only reads. A thrown load error shows a "Failed to load triggers" message.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
