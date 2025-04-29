---
title: Changelogs | Kener
description: Changelogs for Kener
---

# Changelogs

Here are the changelogs for Kener. Changelogs are only published when there are new features or breaking changes.

## v3.2.14

### ✨ Features

- **Gamedig Monitor Functionality:** Introduced a new monitor type using Gamedig to monitor over 320+ games and services. Includes options for host, port, timeout, game/service selection, and documentation updates. ([#389](https://github.com/rajnandan1/kener/pull/389) by ToxykAuBleu)
- **Event Subscription:** Added functionality for event subscriptions, involving new database tables (`subscribers`, `subscriptions`, `subscription_triggers`), UI enhancements, a comprehensive game list, and package version update (3.2.13 to 3.2.14). ([#385](https://github.com/rajnandan1/kener/pull/385) by rajnandan1)
- **CRUD API for Monitors:** Implemented API endpoints for creating, reading, updating, and deleting monitors (`GET /api/monitor`, `POST /api/monitor`, `GET /api/monitor/[monitor_id]`, `PUT /api/monitor/[monitor_id]`, `DELETE /api/monitor/[monitor_id]`). Includes OpenAPI spec updates. ([#384](https://github.com/rajnandan1/kener/pull/384) by jensvandenreyt)
- **Modify Monitor Data:** Added the ability for users to modify historical monitoring data via a new UI option and backend API, useful for correcting past statuses (e.g., false positives). ([#380](https://github.com/rajnandan1/kener/pull/380) by mcorbin)
- **Site Status Banner:** Now you can choose to show a site status banner in the main home page. The setting has to be turned on in the Home section of the kener portal.
- **Upcoming Maintenance**: Dedicated Page for upcoming maintenance events.
- **Event Page**: Dedicated page for each event (incident/maintenance)
- **Admin Portal UI Update**: Revamped kener management portal for better accessibility.

### 🐛 Bug Fixes

- **SMTP Secure Variable Fix:** Corrected the evaluation of the `SMTP_SECURE` environment variable to properly handle values like '0' or empty strings, preventing SSL errors with STARTTLS. ([#392](https://github.com/rajnandan1/kener/pull/392) by myned)
- **Group Monitor Fix:** Fix group monitor using queues

### 🌍 Internationalization

- **Polish Translation:** Added Polish language support (`pl.json`) and integrated it into the application's localization framework. ([#386](https://github.com/rajnandan1/kener/pull/386) by lolen)

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
