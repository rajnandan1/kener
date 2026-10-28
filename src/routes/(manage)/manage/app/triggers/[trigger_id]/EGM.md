# Trigger Editor

## Overview

This route serves `/manage/app/triggers/[trigger_id]`. It creates, edits, tests, and deletes one trigger. A trigger is a saved notification destination in the `triggers` table: a webhook, Discord, Slack, or email target with a Mustache message template. Alert configs send their alerts through triggers. The page reads and writes through the manage API: the `POST /manage/api` endpoint, which checks a permission for each action.

## Interface

- `+page.server.ts` exports `load`. It returns `trigger_id` from the route param and the default templates `email_template`, `webhook_template`, `slack_template`, and `discord_template` from `$lib/server/templates/`.
- The param value `new` opens the editor in create mode with the default templates.
- In edit mode, the page sends `getTriggers` (permission `triggers.read`) and finds the trigger by its numeric id in the browser.
- Save sends `createUpdateTrigger` (permission `triggers.write`) with `id`, `name`, `trigger_type`, `trigger_status`, `trigger_desc`, and `trigger_meta` as a JSON string.
- Test sends `testTrigger` (permission `triggers.write`) with `trigger_id` and `status: "TRIGGERED"`. The handler ignores `status` and picks `TRIGGERED` or `RESOLVED` at random. It tests the saved trigger, not unsaved edits in the form.
- Delete sends `deleteTrigger` (permission `triggers.write`) with `trigger_id`.

## Invariants

- The layout guard in `src/routes/(manage)/+layout.server.ts` lets only users with `triggers.read` open this route.
- `trigger_type` is `webhook`, `discord`, `slack`, or `email`.
- Save needs a name and a type. An email trigger needs a `to` address and a valid `from` value. The other types need a valid `url`.
- Test works only on a saved trigger (one with an `id`).
- Delete runs only when the user types the trigger name exactly.
- `getTriggers` returns the URL and header values masked. When the page saves a masked value back, the server keeps the stored value (`restoreTriggerSecrets` in `src/lib/server/controllers/triggerController.ts`).

## Side Effects

- `createUpdateTrigger` writes the `triggers` row. After a create, the page calls `goto("/manage/app/triggers")`.
- `testTrigger` makes the server send one real message to the destination with test alert data.
- After a delete, the page calls `goto("/manage/app/triggers")`.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
