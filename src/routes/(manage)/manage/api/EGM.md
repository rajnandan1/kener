# Manage API Endpoint

## Overview

This route serves `POST /manage/api`. It is the one endpoint that the dashboard pages under `/manage/app/*` call from the browser to read and write data. Each request names an action, and one handler runs the matching branch. This file uses "manage API" for this endpoint and "action" for the name in the request. `src/lib/allPerms.ts` maps each action to a permission in `ACTION_PERMISSION_MAP`.

## Interface

- `+server.ts` exports `POST({ request, cookies })`. It exports no other HTTP method.
- The request body is JSON: `{ action: string, data?: object }`.
- A success returns status 200 with the action's result as JSON.
- An error returns `{ error: message }` with status 401, 400, 403, or 500.
- The actions fall into these groups:
    - Self: `updateUser`, `updatePassword`, and `sendVerificationEmail`.
    - Site data: `getAllSiteData`, `getSiteDataByKey`, `storeSiteData`, `getSubscriptionsConfig`, and `updateSubscriptionsConfig`.
    - Monitors: `getMonitors`, `storeMonitorData`, `cloneMonitor`, `deleteMonitor`, `testMonitor`, and `listDockerContainers`.
    - Monitoring data: `getMonitoringDataPaginated`, `updateMonitoringData`, and `deleteMonitorData`.
    - Incidents: `getIncidents`, `getIncident`, `createIncident`, `updateIncident`, `deleteIncident`, `addMonitor`, `removeMonitor`, and the comment actions.
    - Maintenances: `getMaintenances`, `createMaintenance`, `updateMaintenance`, `deleteMaintenance`, and the event and monitor actions.
    - Status pages: `getPages`, `createPage`, `updatePage`, `deletePage`, `addMonitorToPage`, `removeMonitorFromPage`, and `reorderPageMonitors`.
    - Alerts and triggers: the alert config actions, the alert actions (`getAllAlertsPaginated`, `updateMonitorAlertV2Status`, and `deleteMonitorAlertV2`), and the trigger actions with `testTrigger`.
    - Users and roles: `getUsers`, `createNewUser`, `manualUpdate`, `resendInvitation`, and the role actions.
    - Other: API keys, subscribers, general email templates, images (`uploadImage` and `deleteImage`), and OIDC (the group-to-role mapping actions, `testOidcConnection`, and `getOidcSettingsMasked`).
- `storeSiteData(data)` is a local helper. It calls `InsertKeyValue` (`src/lib/server/controllers/siteDataController.ts`) once for each key in `data`. It saves a `socialPreviewImage` value of `null` or `undefined` as `""`, and it does not save a key that `data` leaves out.

## Invariants

- The handler checks in this order. Without a session (`GetLoggedInSession` in `src/lib/server/controllers/userController.ts`), it returns 401. When `ACTION_PERMISSION_MAP` has no entry for the action, it returns 400 `Unknown action`. When the user lacks the mapped permission, it returns 403. Then it runs the action.
- A new action needs an entry in `ACTION_PERMISSION_MAP`. Without one, every call returns 400. A `null` entry means that any signed-in user can run the action.
- Some branches check more than the map:
    - `sendVerificationEmail` for another user's id needs `users.write`.
    - `getMonitors` masks the heartbeat secret unless the user has `monitors.write`.
    - `deleteMonitorData` and `getMonitoringDataPaginated` return 400 for a status that `isMonitoringStatus` (`src/lib/global-constants.ts`) rejects.
    - `upsertOidcGroupRoleMapping` needs a group name and a role that exists.
- Reads mask stored secrets before the response: `MaskSiteDataSecret` for site data, `MaskMonitorRecordSecrets` for monitors, `MaskTriggerSecrets` for triggers, and `MaskAlertConfigTriggerSecrets` for alert configs.
- The write controllers restore a masked secret to the stored value when a page saves it back.
- `updateMonitoringData` always sets `type` to `GC.MANUAL` (`src/lib/global-constants.ts`).
- `uploadImage` uses a 256 by 256 maximum unless the request sends `maxWidth` and `maxHeight`.
- `testMonitor` throws for the monitor type `NONE`.
- An error thrown inside the action `try` block becomes status 500 with `{ error: message }`, and the handler logs it with `console.log`. `request.json()`, `GetLoggedInSession`, and `GetUserPermissions` run before that block, so their errors, such as an invalid JSON body, get the SvelteKit default 500 response.

## Side Effects

- The actions read and write the database through the controllers in `src/lib/server/controllers/`. `deleteImage`, `deleteMonitorData`, `deleteMonitorAlertV2`, and the OIDC mapping actions call `db` directly.
- `testTrigger` sends one real webhook, email, Discord, or Slack message with test alert data. It uses the newest monitor tag from the monitoring data, or `test-monitor`.
- `testMonitor` runs one real check through `Service.execute()` (`src/lib/server/services/service.ts`).
- `listDockerContainers` connects to a Docker daemon.
- `testOidcConnection` fetches the OIDC provider's discovery document.
- `createNewUser`, `resendInvitation`, and `sendVerificationEmail` send email.
- `deleteMonitorAlertV2` with `deleteIncident: true` also deletes the linked incident.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm run test:server -- "src/routes/(manage)/manage/api"` (`server.test.ts` checks secret masking on reads and that a save keeps the stored secrets).
- A change to this handler's database reads or writes must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
