# lib

## Overview

This folder is the target of the SvelteKit `$lib` alias. Its `server/` child holds all server-only code. The other child folders hold browser code, components, stores, and shared types. The files directly in this folder hold the helpers and constants that both the server and the browser use: permissions, validators, status helpers, colors, Markdown rendering, and the app version.

## Interface

- `index.ts` exports nothing. It only marks this folder as the `$lib` alias target.
- `allPerms.ts` exports `permissions`, the list of `{ id, permission_name }` records (for example `monitors.read` and `roles.assign_users`) that a role can grant.
- `allPerms.ts` exports `ACTION_PERMISSION_MAP`, which maps each action of `src/routes/(manage)/manage/api/+server.ts` to the permission id it needs, or to `null` for a self-action (`updateUser`, `updatePassword`, `sendVerificationEmail`).
- `allPerms.ts` exports `ROUTE_PERMISSION_MAP`, which maps each `/(manage)/manage/app/...` route id to the read permission that opens the page. `src/routes/(manage)/+layout.server.ts` and `+layout.svelte` read it.
- `anywhere.ts` exports the default eval sources `DefaultAPIEval`, `DefaultPingEval`, `DefaultTCPEval`, and `DefaultGamedigEval`. Each one is a string of an async function that returns `{ status: 'UP' | 'DOWN', latency }`.
- `anywhere.ts` exports the timeouts `GAMEDIG_TIMEOUT`, `GAMEDIG_SOCKET_TIMEOUT`, and `DOCKER_DEFAULT_TIMEOUT`, the constant `DOCKER_DEFAULT_SOCKET_PATH` (`/var/run/docker.sock`), `DOCKER_CONNECTION_TYPES`, `DOCKER_CHECK_TYPES`, and `ErrorSvg` (an inline "Not Found" SVG).
- `anywhere.ts` exports the validators `IsValidProxyURL` and `IsValidHeartbeatSecret`, plus `HEARTBEAT_SECRET_MIN_LENGTH` (12) and the message `HEARTBEAT_SECRET_RULE`.
- `beacon.ts` default-exports `analyticsEvent(event, data)` and exports the `AnalyticsEventDetail` interface.
- `clientTools.ts` exports the network validators `ValidateIpAddress`, `IsValidHost`, `IsValidNameServer`, `IsValidDnsResolver`, `IsValidURL`, and `IsValidPort`, and the DNS record table `AllRecordTypes`.
- `clientTools.ts` exports the status helpers `CollapseStatusCounts`, `GetStatusSummary`, `GetStatusColor`, `GetStatusBgColor`, and `ParseLatency`, and the SSL helpers `ResolveSslExpiresAtMs`, `GetSslSecurityState`, `SslSecurityLabelKey`, `SslSecurityTextClass`, and `FormatSslRemaining`.
- `clientTools.ts` also exports `GetInitials`, `ResolveEventListPlacement`, and the `MonitorItem` interface.
- `color.ts` default-exports the async `StatusColor()`, which returns the `StatusColors` object. `UP`, `DEGRADED`, `DOWN`, and `MAINTENANCE` come from the site color settings, with hard-coded hex values as fallbacks. `NO_DATA` is always `#f1f5f8`.
- `Embed.svelte` is a Svelte component with the props `monitor` (required URL), `theme`, `bgc`, and `locale`. It renders `<monitor>?theme=<theme>&bgc=<bgc>&locale=<locale>` in an iframe. When a prop changes after mount, it sets the new URL on the iframe and dispatches an `update` event with the new props. No file in `src/` imports it.
- `global-constants.ts` default-exports the constants object that importers name `GC` (status and state strings, `HOME_PAGE_TOKEN` `~home`, `STATUS_HISTORY_DAYS_MIN`/`MAX`, `MAX_UPLOAD_BYTES`, `AUTH_PROVIDER_LOCAL`, `AUTH_PROVIDER_OIDC`, and more). It also exports `BADGE_STYLES`, `getBadgeStyle`, `MONITORING_STATUSES`, `isMonitoringStatus`, the `IncidentState` type, and `PAGE_STATUS_MESSAGES`. The `GC` object ends with `as const`, so it is read-only in TypeScript only. The file never calls `Object.freeze`.
- `icons.ts` default-exports a map from keys such as `UP`, `DOWN`, and `NO_DATA` to `@lucide/svelte` icon components.
- `marked.ts` default-exports `mdToHTML(markdown)`, which renders GitHub-flavored Markdown with highlight.js code blocks, and exports `mdToText(markdown)`, which strips the Markdown to plain text.
- `utils.ts` exports `cn(...inputs)`, which merges class names with clsx and tailwind-merge, and the helper types `WithoutChild`, `WithoutChildren`, `WithoutChildrenOrChild`, and `WithElementRef`.
- `version.ts` default-exports `version()`, which returns `import.meta.env.PACKAGE_VERSION`, then `process.env.npm_package_version`, then `"0.0.0"`.
- `all-games-list.json` is a data file: the list of games `{ id, name, isValve? }` for GameDig monitors.
- Child folders:
    - [alerts](./alerts/EGM.md): `getAlertText` builds the label, help text, and description of a monitor alert rule for the `/manage/app/alerts` pages.
    - [client](./client/EGM.md): The browser helpers compute day boundaries in the viewer's timezone, set up the layout store, fetch monitor bars in batches with a cache, fetch notifications, build base-path URLs, and run a reactive SSL clock.
    - [components](./components/EGM.md): The Svelte 5 components draw the public status page, the embed pages, and the account pages. The generated shadcn-svelte components in `components/ui/` have no EGM contract.
    - [hooks](./hooks/EGM.md): Two Svelte 5 helper classes: `IsMobile` (a media query below 768 px by default) and `UseClipboard` (copy with a timed status).
    - [server](./server/EGM.md): All server-only code lives here: the database layer, the controllers, the monitor checks, the BullMQ job queues, the schedulers, and the message senders.
    - [snippets](./snippets/EGM.md): Kener serves or shows these text snippets as they are, for example the analytics snippets for `/capture.js`.
    - [stores](./stores/EGM.md): The Svelte stores hold the viewer's locale (`$t`), timezone, and date formatting.
    - [types](./types/EGM.md): The shared TypeScript types serve the server, the browser, and `/api/v4`: API request and response shapes, monitor and status types, site settings, and notifications.
- Folders with no code and no EGM contract: `assets/` holds `favicon.svg`. `locales/` holds one `{code}.json` file per language, and the app loads each one with no registration.

## Invariants

- Browser code must never import from `server/`. SvelteKit rejects a `$lib/server` import in a client bundle.
- `color.ts` imports `GetAllSiteData` from `$lib/server/controllers/controller.js`, so only server code may import `color.ts`.
- `clientTools.ts` imports `TimestampStatusCount` from `$lib/server/types/db` only with `import type`. That import must stay type-only, so the module still loads in the browser.
- `global-constants.ts` has only a type import, and browser code imports it at run time. It must stay free of runtime imports.
- `version.ts` must not import Node modules. It reads `process` only behind a `typeof process !== "undefined"` guard.
- `beacon.ts` keeps its `typeof document !== "undefined"` guard, so `analyticsEvent` does nothing during server rendering.
- Every non-null value in `ACTION_PERMISSION_MAP` and `ROUTE_PERMISSION_MAP` must be an `id` in `permissions`. A new action in `src/routes/(manage)/manage/api/+server.ts` needs an entry in `ACTION_PERMISSION_MAP`.
- `clientTools.ts` exports its helpers through one `export { ... }` block at the end of the file. A new helper is not importable until it is in that block. The only inline export is `export interface MonitorItem`.
- `IsValidProxyURL` rejects every scheme except lowercase `http://` and `https://`, because Node ignores other proxy schemes at check time.
- `mdToHTML` does not sanitize its output, although its doc comment says "Sanitized HTML". A page that renders the output must wrap it in `SveltePurify`, as every `.svelte` caller does now.
- `marked.ts` keeps two separate `Marked` instances, `markedHTML` and `markedText`, so their extensions do not mix. Add a new extension to the correct instance, never to the global `marked`.

## Side Effects

- `analyticsEvent` dispatches a bubbling `CustomEvent` named `analyticsEvent` on `document`, with the detail `{ event: "kener_" + event, data }`.
- `StatusColor()` reads the site settings through `GetAllSiteData()` on every call and caches nothing.
- `Embed.svelte` creates an iframe on mount. It adds a `message` listener on `window` that resizes the iframe from `event.data.height` and `event.data.width`, and the listener does not check `event.origin`.
- `marked.ts` builds its two `Marked` instances once, when the module loads.
- `GetSslSecurityState` and `FormatSslRemaining` read `Date.now()` when the caller passes no `nowMs`. The other exports of `allPerms.ts`, `anywhere.ts`, `clientTools.ts`, `global-constants.ts`, `icons.ts`, and `utils.ts` are constants or pure functions with no I/O.

## Verification

- Run `npm run check` (svelte-kit sync and the svelte-check type check).
- Run `npm run test:server -- "src/lib/clientTools.test.ts"` and `npm run test:server -- "src/lib/global-constants.test.ts"`.
