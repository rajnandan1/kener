---
title: Changelogs | Kener
description: Changelogs for Kener
---

# Changelogs

## v0.0.16

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
-   Redesigned the UI for better consistency
-   Embed now supports background color using a parameter `bgc`. Read more [here](/docs/embed#javascript-parameters)

### Migration

#### Source

-   Move data from `PUBLIC_KENER_FOLDER` to `/database` file.
-   Move `site.yaml` to `/config` folder
-   Move `monitors.yaml` to `/config` folder

#### Docker

-   Use `-v $(pwd)/database:/app/database` and `-v $(pwd)/config:/app/config` in your docker run command
