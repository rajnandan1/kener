# Monitor Editor Page

## Overview

This route serves `/manage/app/monitors/[tag]`. It creates, edits, clones, and deletes one monitor. A monitor is a scheduled check in the `monitors` table, keyed by its unique `tag`. The page loads the monitor and hands each part of it to a card in `./components/`. Each card saves on its own through the manage API: the `POST /manage/api` endpoint, which checks a permission for each action.

## Interface

- `+page.server.ts` exports `load`, which returns `{ dockerDefaults: getDockerDefaults() }` from `src/lib/server/docker.ts`. It sends no other environment value to the browser.
- The param value `new` opens the editor in create mode.
- The page sends `getMonitors` (permission `monitors.read`) with `{ tag }` to load the monitor, and with `{ status: "ACTIVE" }` to fill the group member list.
- The page sends `getPages` (permission `pages.read`) and `getSiteDataByKey` with the key `subMenuOptions` (permission `settings.read`).
- The Clone dialog sends `cloneMonitor` (permission `monitors.write`) with `sourceTag`, `newTag`, and `newName`.
- The page renders the cards in this order: General Settings, Configuration (`MonitorTypeCard`), Uptime Calculation, Status History, Recent Logs, Page Visibility, Sharing Options, Modify Data, and Danger Zone.
- [Cards](./components/EGM.md): the nine cards that edit and save parts of a monitor.
- [Type forms](./types/EGM.md): one form per monitor type, bound to `type_data`.

## Invariants

- The layout guard in `src/routes/(manage)/+layout.server.ts` lets only users with `monitors.read` open this route. The page itself checks no write permission. The manage API enforces `monitors.write`.
- In create mode, the page renders only General Settings. The default monitor has cron `* * * * *`, status `ACTIVE`, `is_hidden` `NO`, and `confirmation_threshold` 1.
- The page parses `type_data` as JSON. A missing value, a parse error, or a value that is not an object gives `{}`.
- The page parses `monitor_settings_json` into `uptimeSettings` (two formula keys) and `statusHistoryDays`. A parse error keeps the defaults.
- Clone needs a new tag and a new name. The page fills the name as `{name} Copy`.
- The page shows a warning when a saved monitor is on no status page.

## Side Effects

- This page writes only through `cloneMonitor`. The cards in `./components/` do all other writes, including the create.
- After a clone, the page calls `goto("/manage/app/monitors/{newTag}")`.
- The View button opens the public monitor page `/monitors/{tag}` in a new tab.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm run test:server -- "src/routes/(manage)/manage/app/monitors/[tag]"` (`page.server.test.ts` checks that `load` sends only the Docker defaults).
