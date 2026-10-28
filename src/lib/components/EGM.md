# components

## Overview

This folder holds the Svelte 5 components of the public status page, the embed pages, and the account pages. They include the monitor bars, the status calendars, the day-detail dialog, the incident and maintenance cards, the nav bar, and the menus for theme, language, timezone, subscription, embed code, and badges. Most components only render their props. A few fetch data from the public `/dashboard-apis/<action>` endpoints (no API key needed) or call the helpers in `src/lib/client/`. About 27 route files import from this folder.

## Interface

- Monitor display:
    - `MonitorBar.svelte` renders one monitor row: the name, the uptime or SSL state, and a `StatusBarCalendar`. Props: `tag` (required), `prefetchedData`, `prefetchedError`, `groupChildTags`, `days`, `endOfDayTodayAtTz`, `compact`, and `grid`.
    - `StatusBarCalendar.svelte` draws the daily status bars on a canvas. A click on a day opens `MonitorDayDetail`. Props: `data`, `monitorTag`, `barHeight` (default 40), `radius` (default 8), `class`, and `disableClick` (default `false`).
    - `MonitorDayDetail.svelte` is the dialog for one day: status, latency, incidents, and maintenances. Props: `open` (bindable), `monitorTag`, and `selectedDay`.
    - `MinuteGrid.svelte` draws the per-minute status on a canvas. Props: `minutes` and `uptime`.
    - `MonitorOverview.svelte` shows the uptime and latency of a monitor for a chosen day range, with a chart. Props: `monitorTag`, `class`, `maxDays` (default 90), and `groupTags`.
    - `LatencyTrendChart.svelte` draws a latency trend. Props: `data`, `label`, `height` (default 128), and `class`.
    - `GroupMonitorPopover.svelte` lists the child monitor bars of a GROUP monitor. Props: `tags`, `days`, `endOfDayTodayAtTz`, and `children`.
- Events:
    - `IncidentItem.svelte` renders one incident. Props: `incident`, `class`, `hideMonitors`, `showComments`, and `showSummary`.
    - `MaintenanceItem.svelte` renders one maintenance event. Props: `maintenance`, `class`, and `hideMonitors`.
    - `IncidentMonitorList.svelte` lists incidents under a title. `EventsCard.svelte` shows one event status.
    - `NotificationsPopover.svelte` and `NotificationsList.svelte` show recent events from `requestNotifications`. `NotificationsList` has the bindable props `notifications` and `loading`, and the prop `fetchOnMount` (default `true`).
- Navigation, menus, and settings:
    - `KenerNav.svelte`, `KenerFooter.svelte`, `PageList.svelte`, and `PageSelector.svelte` render the nav bar, the footer, and the list of status pages.
    - `SiteBanner.svelte` shows the site announcement, which the viewer can dismiss.
    - `ThemePlus.svelte` is the toolbar: theme toggle, RSS, share link, language, and the embed, badge, subscribe, and notification menus. Props: `monitor_tags`, `embedMonitorTag`, and `hideNotificationsPopover`.
    - `LanguageSelector.svelte` and `TimezoneSelector.svelte` set the `i18n` and `timezone` stores from `src/lib/stores/`.
    - `SubscribeMenu.svelte` is the email subscription dialog. The viewer enters an email, then a one-time code (OTP), and then picks incident and maintenance preferences.
    - `EmbedMenu.svelte` and `BadgesMenu.svelte` build embed code and badge snippets for a monitor. Props: `protocol` and `domain`.
- Small parts:
    - `Captcha.svelte` renders an hCaptcha, reCAPTCHA, or Turnstile widget. Props: `onVerify(token: string | null)` (required) and `onReady(required: boolean)`. The instance exports `reset()`, and the module script exports `loadScript(src)`.
    - `CopyButton.svelte` copies its `text` prop with `UseClipboard` from `src/lib/hooks/`.
    - `LocalTime.svelte` shows a time in the viewer's timezone with its UTC offset, and the UTC time in a tooltip. Props: `value` (required), `format`, and `class`.
    - `MonitorPicker.svelte` lets the user search and pick monitors. Props: `monitors`, `selectedTags`, `onToggle`, `onAddMany`, and `placeholder`.
    - `loaderbox.svelte` is a loading placeholder.
- `LocalTime.harness.svelte` is a test harness for `LocalTime.svelte.test.ts`. It is not app code.
- [manage](./manage/EGM.md) holds `ProviderSettingsPanel.svelte`, the admin panel for CAPTCHA and analytics providers.
- `ui/` holds generated shadcn-svelte components. EGM does not document it.

## Invariants

- No component imports runtime code from `$lib/server`. Twelve files import server types with `import type` only. Keep the components free of server code, because they run in the browser.
- Build every fetch URL and asset path with `clientResolver(resolve, path)` from `src/lib/client/resolver.ts`, so that it keeps the base path.
- Timestamps are UTC seconds. The components multiply them by 1000 before `new Date(...)`, and compare them with `Math.floor(Date.now() / 1000)`. `LocalTime` accepts seconds, a `Date`, or a string through `parseDateInput` from `src/lib/stores/datetime.ts`.
- `LocalTime` needs a `Tooltip.Provider` higher in the component tree.
- The components read the viewer's timezone from the `selectedTimezone` store and the UI text from the `$t` store. A few strings are still English literals, for example `Failed to load monitor:` in `MonitorBar.svelte`.
- `MonitorBar` never fetches. Its parent passes `prefetchedData` or `prefetchedError`, and `MonitorBar` shows a skeleton until one of them arrives.
- `MonitorOverview` calls `clearMonitorBarCache()` when the viewer changes the day range, and then fetches again.
- `Captcha` gets the provider and the site key from `/captcha-config.json`. It calls `onReady(true)` when a captcha is required, also when the provider is enabled but misconfigured. It calls `onReady(false)` when no provider is enabled, and also when the `/captcha-config.json` fetch or parse fails before it confirms a provider. An expired or failed challenge calls `onVerify(null)`.
- `Captcha` shares script loads between instances through one module-level map. It removes a failed load from the map, so that a retry can run.
- `SubscribeMenu` checks that the email is not empty and that the code has exactly 6 characters. It renders `Captcha` and keeps the "Continue" button disabled while a captcha is required and no token is set. It sends the token as `captchaToken` in the `login` request. The server does the real checks.
- When a captcha is required, the "Didn't receive the code? Resend" button sends the viewer back to the email view and does not send `login` again. The OTP view has no captcha widget to make a new token.

## Side Effects

- `MonitorDayDetail` sends POST to `/dashboard-apis/monitor-day-status`, `/dashboard-apis/monitor-day-latency`, `/dashboard-apis/monitor-day-incidents`, and `/dashboard-apis/monitor-day-maintenances`.
- `SubscribeMenu` sends POST `/dashboard-apis/subscription` with `action` set to `getPreferences`, `login`, `verify`, or `updatePreferences`. It reads, writes, and removes the localStorage key `subscriber_token`.
- `PageList` and `PageSelector` send GET `/dashboard-apis/pages` on mount.
- `Captcha` sends GET `/captcha-config.json`. It then adds one of these scripts to `document.head`: `https://js.hcaptcha.com/1/api.js`, `https://www.google.com/recaptcha/api.js`, or `https://challenges.cloudflare.com/turnstile/v0/api.js`.
- `GroupMonitorPopover` and `MonitorOverview` call `requestMonitorBar`, which sends GET `/dashboard-apis/monitor-bars`. `NotificationsPopover` and `NotificationsList` call `requestNotifications`, which sends GET `/dashboard-apis/notifications`.
- `SiteBanner` stores the dismiss time in localStorage. It shows the banner again after `reshowAfterInHours`.
- `ThemePlus` sets the theme with `setMode` from `mode-watcher`. `LanguageSelector` calls `i18n.setLocale`, and `TimezoneSelector` calls `timezone.setTimezone`. Both store methods write localStorage.
- Many components send analytics events with `trackEvent`, the default export of `src/lib/beacon.ts`, for example `theme_toggled` and `subscribe_opened`. The snippets in `src/lib/snippets/capture/` forward these events to the enabled analytics vendors.

## Verification

- Run `npm run check` (svelte-kit sync and the svelte-check type check).
- Run `npm run test:client -- "src/lib/components"`. The component tests run in Chromium. This filter also runs the test in `manage/`.
