# Dashboard Pages

## Overview

This folder has no page of its own. It holds the admin dashboard pages, each served at `/manage/app/{folder}`. Every page here follows the same pattern:

- The layout guard in `src/routes/(manage)/+layout.server.ts` checks the session and the route's permission from `ROUTE_PERMISSION_MAP` in `src/lib/allPerms.ts` before the page opens.
- The page loads and saves data in the browser through the manage API: the `POST /manage/api` endpoint in `src/routes/(manage)/manage/api/+server.ts`. Each request names an action, and the endpoint checks the action's permission from `ACTION_PERMISSION_MAP`.
- A page that saves settings writes site data (the key-value settings in the `site_data` table) with the `storeSiteData` action. The subscriptions page saves its `subscriptionsSettings` key with the `updateSubscriptionsConfig` action instead.

A new page here needs an entry in `ROUTE_PERMISSION_MAP`, or the layout guard returns 403. It also needs an item in the sidebar list in `src/routes/(manage)/+layout.svelte`.

## Subdirectories & Boundaries

- [alerts](./alerts/EGM.md): This page lists the alert configs, with the editor and the alert logs below it. It needs `alerts.read`.
- [analytics-providers](./analytics-providers/EGM.md): This page configures the web analytics scripts in the `analytics.*` site data keys. It needs `settings.read`.
- [api-keys](./api-keys/EGM.md): This page lists, creates, turns on or off, and deletes API keys for `/api/v4`. It needs `api_keys.read`.
- [badges](./badges/EGM.md): This page builds `/badge/{tag}/{type}` URLs and snippets. It writes no data and needs `settings.read`.
- [captcha-providers](./captcha-providers/EGM.md): This page configures one active CAPTCHA provider in the `captcha.*` site data keys. It needs `settings.read`.
- [customizations](./customizations/EGM.md): This page edits the footer, colors, font, CSS, theme, announcement, and page order. It needs `settings.read`.
- [embed](./embed/EGM.md): This page builds iframe and script embed code for `/embed/...`. It writes no data and needs `settings.read`.
- [incidents](./incidents/EGM.md): This page lists the open incidents, with the incident editor below it. It needs `incidents.read`.
- [internationalization](./internationalization/EGM.md): This page sets the languages, the time zone switch, and the date formats. It needs `settings.read`.
- [maintenances](./maintenances/EGM.md): This page lists the maintenances, with the maintenance editor below it. It needs `maintenances.read`.
- [monitoring-data](./monitoring-data/EGM.md): This page lists and deletes rows of `monitoring_data`. It needs `monitors.read`.
- [monitors](./monitors/EGM.md): This page lists the monitors, with the monitor editor, its cards, and its type forms below it. It needs `monitors.read`.
- [oidc](./oidc/EGM.md): This page configures OpenID Connect sign-in and the group-to-role mappings. It needs `settings.read`.
- [pages](./pages/EGM.md): This page lists the status pages, with the status page editor below it. It needs `pages.read`.
- [roles](./roles/EGM.md): This page manages roles, their permissions, and their users. It needs `roles.read`.
- [site-configurations](./site-configurations/EGM.md): This page edits the main site settings, the images, the navigation, and the retention and sitemap settings. It needs `settings.read`.
- [subscriptions](./subscriptions/EGM.md): This page turns email subscriptions on or off and manages the subscribers. It needs `subscribers.read`.
- [templates](./templates/EGM.md): This page edits the general email templates. It needs `email_templates.read`.
- [triggers](./triggers/EGM.md): This page lists the triggers, with the trigger editor below it. It needs `triggers.read`.
- [users](./users/EGM.md): This page lists, invites, and updates the dashboard users. It needs `users.read`.
