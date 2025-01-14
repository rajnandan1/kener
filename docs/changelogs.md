---
title: Changelogs | Kener
description: Changelogs for Kener
---

# Changelogs

## v3.0.0

<picture>
  <source srcset="https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.webp" type="image/webp">
  <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.gif" alt="🚀" width="32" height="32">
</picture>

Here are the changes in this release

### Features

-   New APIs for creating incidents and pushing updates. Read more [here](/docs/kener-apis)
-   New Admin UI for managing kener.
-   Incident management is now part of the admin UI and removed from the config file.
-   The UI colors have been updated to be more muted.
-   Email Notifications for incidents using [resend](https://resend.com).

## v2.0.0

<picture>
  <source srcset="https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.webp" type="image/webp">
  <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.gif" alt="🚀" width="32" height="32">
</picture>

Here are the changes in this release

### Features

-   Added support for sqlite3 and removed dependency on file system
-   Added support for postgres database. Read more [here](/docs/database)
-   Added support for alerting. Read more [here](/docs/alerting)
-   Added color customization. Read more [here](/docs/customize-site#color)
-   Added three new customizations for home page. Read more [here](/docs/customize-site#barstyle)
    -   `barStyle`
    -   `barRoundness`
    -   `summaryStyle`

### Migration

Kener will automatically migrate your data from file system to sqlite3. If you are using a custom domain, you need to update the `site.yaml` file with the new `siteURL` field. Read more [here](/docs/customize-site#siteURL)

## v0.0.16

<picture>
  <source srcset="https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.webp" type="image/webp">
  <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.gif" alt="🚀" width="32" height="32">
</picture>

Here are the changes in this release

### Features

-   Added support for `hideURLForGet` in monitors. Read more [here](/docs/monitors)
-   New SVG badges for LIVE status. Read more [here](/docs/status-badges#live)
-   `[Breaking Change]` Removed dependency on Environment variable `PUBLIC_KENER_FOLDER`. Read more [here](#v0-0-16-migration)
-   Simplified build and deploy process
-   Added support for fonts. Read more [here](/docs/customize-site#font)
-   Added support for home page pattern. Read more [here](/docs/customize-site#pattern)
-   Added support for adding your analytics provider. Read more [here](/docs/site-analytics)
-   New Documentation Site
-   Addes support for `sqaures` pattern in home page. Read more [here](/docs/customize-site#pattern)
-   Redesigned the UI for better consistency
-   Embed now supports background color using a parameter `bgc`. Read more [here](/docs/embed#javascript-parameters)
-   Now title in `site.yaml` is `<title>` and `siteName` is actually the name of the site. Read more [here](/docs/customize-site#siteName)

### Migration

#### Source

-   Move data from `PUBLIC_KENER_FOLDER` to `/database` file.
-   Move `site.yaml` to `/config` folder
-   Move `monitors.yaml` to `/config` folder

#### Docker

-   Use `-v $(pwd)/database:/app/database` and `-v $(pwd)/config:/app/config` in your docker run command
