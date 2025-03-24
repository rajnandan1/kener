---
title: Changelogs | Kener
description: Changelogs for Kener
---

# Changelogs

Here are the changelogs for Kener. Changelogs are only published when there are new features or breaking changes.

## v3.2.5

<picture>
  <source srcset="https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.webp" type="image/webp">
  <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.gif" alt="🚀" width="32" height="32">
</picture>

### Features

- Added code editing for all JavaScript and JSON fields for trigger custom body and monitor `evals`.
- Syntax highlighting and error checking for monitor evaluation functions
- Added support for custom Discord and Slack body templates in triggers
- Improved variable templating for all notification types
- Added comprehensive user management with 3 roles: admin, editor, and member. Read more [here](/docs/rbac)
- Self-service profile management for all users
- User activation/deactivation controls for admins
- Added dedicated Badges management page in the admin dashboard
- Site-wide status badges to show overall service health
- Version information automatically pulled from package.json

### Improvements

- Improved build time by migrating lucid-svelte to individual components

### Github Issues Resolved

- Feature: Enhancement of Webhook Custom Body Functionality [#238](https://github.com/rajnandan1/kener/issues/238)
- Feature: Add LDAP for authentication [#210](https://github.com/rajnandan1/kener/issues/210)
- the event created by tigger can't update affects. [#309](https://github.com/rajnandan1/kener/issues/309)
- Multiple account or RBAC [#334](https://github.com/rajnandan1/kener/issues/334)
- The event that has been edited isn't clickable after you save it [#350](https://github.com/rajnandan1/kener/issues/350)
- /app/package.json ERROR on fresh install [#346](https://github.com/rajnandan1/kener/issues/346)
- Site stops when monitor processing throws an error [#345](https://github.com/rajnandan1/kener/issues/345)
- Support for Self Signed Certificates [#351](https://github.com/rajnandan1/kener/issues/351)
- Wrong month is showing up after clicking on the 'Browse Events' link [#349](https://github.com/rajnandan1/kener/issues/349)

### Migration Notes

This update is fully backward compatible with existing installations. User accounts created before this update will retain admin privileges by default.

## v3.2.1

<picture>
  <source srcset="https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.webp" type="image/webp">
  <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.gif" alt="🚀" width="32" height="32">
</picture>

### Features

- **New Heartbeat Monitors**

    - Added support for push-based monitoring via heartbeats
    - Monitors systems that send periodic signals to confirm they're running
    - Configurable thresholds for degraded and down states
    - Secured with secret token authentication
    - Accessible via simple HTTP API endpoints

- **Data Interpolation Improvements**
    - Fixed data interpolation issues for more accurate uptime calculations
    - Improved handling of timestamp boundaries

### Fixes & Improvements

- **UI Enhancements**

    - Better mobile responsiveness for theme toggles and controls
    - Fixed layout issues with bottom navigation buttons
    - Improved timezone selector display

- **Data Processing**

    - Fixed edge case issues with uptime calculations
    - Improved handling of "No Data" status in summaries
    - More accurate time range display across timezones

- **Documentation**
    - Added comprehensive documentation for Heartbeat Monitors
    - Updated API documentation with new endpoints

## v3.2.0

<picture>
  <source srcset="https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.webp" type="image/webp">
  <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.gif" alt="🚀" width="32" height="32">
</picture>

### Features

- **Improved Monitor Evaluation Functions**

    - Replaced unsafe `eval()` with secure `Function()` constructors across all monitor types
    - Added support for using modules (like cheerio) directly in evaluation functions

- **Enhanced API Monitors**

    - Raw response data is now passed directly to eval functions instead of base64 encoded
    - Added `modules` parameter with access to cheerio for HTML parsing
    - Updated default evaluation function to use the new parameter structure

- **Improved TCP & Ping Monitors**

    - Simplified evaluation functions with direct access to ping/TCP data
    - Removed unnecessary base64 encoding/decoding steps
    - Better error handling for invalid evaluation functions

- **Documentation Updates**
    - Updated all examples and documentation for the new evaluation function signatures
    - Added more detailed explanations of input parameters
    - Improved examples showing usage with the new parameter structure

### Breaking Changes

- **Monitor Evaluation Functions**
    - Custom evaluation functions will need to be updated to the new parameter structure
    - API monitors: `(statusCode, responseTime, responseRaw, modules)` instead of `(statusCode, responseTime, responseDataBase64)`
    - TCP/Ping monitors: `(arrayOfPings)` instead of `(responseDataBase64)`

### Fixes

- Fixed "cheerio is undefined" errors in API monitor evaluations
- Improved error handling and logging for monitor evaluation failures
- Security enhancements by removing `eval()` usage

### Migration

If you're using custom evaluation functions in your monitors, you'll need to update them to the new format:

#### API Monitors

```javascript
// Old format
;(async function (statusCode, responseTime, responseDataBase64) {
    const resp = atob(responseDataBase64)
    // Your logic here
})
```

```javascript
// New format
;(async function (statusCode, responseTime, responseRaw, modules) {
    // responseRaw is the direct response - no need to decode
    // Access cheerio with modules.cheerio
    // Your logic here
})
```

#### TCP/Ping Monitors

```javascript
// Old format
;(async function (responseDataBase64) {
    let arrayOfPings = JSON.parse(atob(responseDataBase64))
    // Your logic here
})
```

```javascript
// New format
;(async function (arrayOfPings) {
    // arrayOfPings is directly available - no need to decode
    // Your logic here
})
```

## v3.1.8

<picture>
  <source srcset="https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.webp" type="image/webp">
  <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.gif" alt="🚀" width="32" height="32">
</picture>

### Features

- **Timezone Support & UI Toggle**

    - Added timezone support using `date-fns-tz` for improved date formatting.
    - Introduced a UI toggle in settings to switch between different timezones.

- **Enhanced Incident Management**

    - Improved incident filtering to prevent duplicate auto incidents when creating manual incidents.
    - Added support for incident sources to refine incident handling.

- **Dynamic Cron Job Scheduling**

    - Cron jobs are now dynamically added and removed based on active monitors.
    - Ensures jobs are triggered in the correct order and prevents duplicate incidents.

- **Monitor Component Improvements**
    - Refactored monitor component for better data display and interaction.
    - Improved uptime calculations.
    - Added a dropdown to select time ranges for better visibility.

### Fixes & Improvements

- **Refactored Incident Handling & Scheduling** for better reliability and performance.
- **UI Responsiveness Fixes** to improve the experience on smaller screens.
- **Dependency Updates** to support new timezone functionality and ensure stability.

## v3.0.10

<picture>
  <source srcset="https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.webp" type="image/webp">
  <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.gif" alt="🚀" width="32" height="32">
</picture>

### Features

- Added TCP monitors

### Breaking Changes

- Ping monitors will break.

### Fixes

- Bug fixes in the UI

## v3.0.9

<picture>
  <source srcset="https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.webp" type="image/webp">
  <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.gif" alt="🚀" width="32" height="32">
</picture>

### Features

- Support of SMTP for email notifications. Read more [here](/docs/triggers/#email-smtp)
- Introduction of event type `MAINTENANCE` for incidents.
- You can write eval function for ping now in monitors. Read more [here](/docs/monitors-ping/#eval)
- Added category filter for monitor management.

### Fixes

- Support longer TLD in `siteURL` example `https://example.network`
- Remove googleapis preconnect and preload
- Fixed wrong action url in webhook.

## v3.0.1

<picture>
  <source srcset="https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.webp" type="image/webp">
  <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.gif" alt="🚀" width="32" height="32">
</picture>

Here are the changes in this release

### Features

- Support for i18n in dates.
- Support of i18n in monitor embeds. Read more [here](/docs/embed#javascript-parameters)

## v3.0.0

<picture>
  <source srcset="https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.webp" type="image/webp">
  <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.gif" alt="🚀" width="32" height="32">
</picture>

Here are the changes in this release

### Features

- New APIs for creating incidents and pushing updates. Read more [here](/docs/kener-apis)
- Incident management is now part of the admin UI and removed from the config file.
- The UI colors have been updated to be more muted.
- Email Notifications for incidents using [resend](https://resend.com).
- New Kener management portal. No monitors.yaml or site.yaml needed anymore
- Login Page and Setup Page
- Remove Github dependency
- Options to disable square or dot pattern
- Support for new languages
- Multiple DB support (mysql, postgres, sqlite3)
- New API reference
- New documentation site

## v2.0.0

<picture>
  <source srcset="https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.webp" type="image/webp">
  <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.gif" alt="🚀" width="32" height="32">
</picture>

Here are the changes in this release

### Features

- Added support for sqlite3 and removed dependency on file system
- Added support for postgres database. Read more [here](/docs/database)
- Added support for alerting. Read more [here](/docs/alerting)
- Added color customization. Read more [here](/docs/customize-site#color)
- Added three new customizations for home page. Read more [here](/docs/customize-site#barstyle)
    - `barStyle`
    - `barRoundness`
    - `summaryStyle`

### Migration

Kener will automatically migrate your data from file system to sqlite3. If you are using a custom domain, you need to update the `site.yaml` file with the new `siteURL` field. Read more [here](/docs/customize-site#siteURL)

## v0.0.16

<picture>
  <source srcset="https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.webp" type="image/webp">
  <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.gif" alt="🚀" width="32" height="32">
</picture>

Here are the changes in this release

### Features

- Added support for `hideURLForGet` in monitors. Read more [here](/docs/monitors)
- New SVG badges for LIVE status. Read more [here](/docs/status-badges#live)
- `[Breaking Change]` Removed dependency on Environment variable `PUBLIC_KENER_FOLDER`. Read more [here](#v0-0-16-migration)
- Simplified build and deploy process
- Added support for fonts. Read more [here](/docs/customize-site#font)
- Added support for home page pattern. Read more [here](/docs/customize-site#pattern)
- Added support for adding your analytics provider. Read more [here](/docs/site-analytics)
- New Documentation Site
- Addes support for `sqaures` pattern in home page. Read more [here](/docs/customize-site#pattern)
- Redesigned the UI for better consistency
- Embed now supports background color using a parameter `bgc`. Read more [here](/docs/embed#javascript-parameters)
- Now title in `site.yaml` is `<title>` and `siteName` is actually the name of the site. Read more [here](/docs/customize-site#siteName)

### Migration

#### Source

- Move data from `PUBLIC_KENER_FOLDER` to `/database` file.
- Move `site.yaml` to `/config` folder
- Move `monitors.yaml` to `/config` folder

#### Docker

- Use `-v $(pwd)/database:/app/database` and `-v $(pwd)/config:/app/config` in your docker run command
