# Site Configurations Page

## Overview

This route serves `/manage/app/site-configurations`. It edits the main site settings: the name and URL, the logo, the favicon, the social preview and SEO text, and the navigation links. It also edits the sub menu options, page visibility, data retention, event display, the sitemap, and maintenance reminders. It reads and writes site data (the key-value settings in the `site_data` table) through the manage API: the `POST /manage/api` endpoint, which checks a permission for each action.

## Interface

- The page sends `getAllSiteData` (permission `settings.read`) to load every key.
- Each card saves its own keys with `storeSiteData` (permission `settings.write`):
    - The site info card saves `siteName` and `siteURL`.
    - The image cards save `logo`, `favicon`, and `socialPreviewImage`. The social preview card also saves `metaSiteTitle` and `metaSiteDescription`.
    - The navigation card saves `nav` as a JSON list of `{ name, url, iconURL }`.
    - The JSON cards save `subMenuOptions`, `globalPageVisibilitySettings`, `dataRetentionPolicy`, `eventDisplaySettings`, `sitemap`, and `globalMaintenanceNotificationSettings`.
- The image fields and the navigation icons send `uploadImage` (permission `images.write`) with `base64`, `mimeType`, `fileName`, `maxWidth`, and `maxHeight`.

## Invariants

- The layout guard in `src/routes/(manage)/+layout.server.ts` lets only users with `settings.read` open this route.
- The site info save needs a `siteName` and a `siteURL`. `siteURL` must be an origin only: `http` or `https`, with no user name, password, path, query, or hash.
- The page warns when the entered origin differs from the origin in the browser.
- The image upload accepts PNG, JPEG, and WebP up to `GC.MAX_UPLOAD_BYTES`. The error text names SVG, but the type check rejects it.
- The upload asks for at most 256 by 256 for the logo, 64 by 64 for the favicon, 640 by 320 for the social preview, and 32 by 32 for a navigation icon. A navigation icon must be smaller than 100 KB.
- The data retention save sends `retentionDays` as at least 1, and the default is 90.
- The maintenance reminder buffer must be a number of at least 1 hour.
- When `forceExclusivity` is on, the page saves `showSwitcher` as `true`.
- The sitemap save runs only when `isValidSitemap` is true.
- `InsertKeyValue` on the server rejects a key that is not in `src/lib/server/controllers/siteDataKeys.ts`, or a value that fails that key's check.

## Side Effects

- Each card writes only its own keys to `site_data`.
- `uploadImage` stores the image in `images` and returns its URL. The page saves the URL with the next `storeSiteData`.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
