# Customizations Page

## Overview

This route serves `/manage/app/customizations`. It edits how the public status page looks: the footer, the status colors, the font, custom CSS, the theme, the announcement banner, and the order of status pages. It reads and writes site data (the key-value settings in the `site_data` table) through the manage API: the `POST /manage/api` endpoint, which checks a permission for each action.

## Interface

- The page sends `getAllSiteData` (permission `settings.read`). It reads `footerHTML`, `colors`, `colorsDark`, `font`, `customCSS`, `theme`, `themeToggle`, `announcement`, and `pageOrderingSettings`.
- The page sends `getPages` (permission `pages.read`) to list the status pages for the ordering card.
- Each card saves its own keys with `storeSiteData` (permission `settings.write`): `{ footerHTML }`, `{ colors, colorsDark }`, `{ font }`, `{ customCSS }`, `{ theme, themeToggle }`, `{ announcement }`, and `{ pageOrderingSettings }`.

## Invariants

- The layout guard in `src/routes/(manage)/+layout.server.ts` lets only users with `settings.read` open this route.
- The page sends `colors`, `colorsDark`, `font`, `announcement`, and `pageOrderingSettings` as JSON strings. It sends `footerHTML`, `customCSS`, `theme`, and `themeToggle` as plain strings.
- The color keys are `UP`, `DOWN`, `DEGRADED`, `MAINTENANCE`, `ACCENT`, and `ACCENT_FOREGROUND`. A missing color falls back to the default. When `colorsDark` is missing, the page copies `colors` and sets `ACCENT` to `#27272a`.
- `theme` is `light`, `dark`, or `system`, and the default is `system`. `themeToggle` is `YES` or `NO`, and the default is `YES`.
- The announcement type is `INFO`, `WARNING`, or `ERROR`. A blank `reshowAfterInHours`, `ctaURL`, or `ctaText` becomes `null`.
- `pageOrderingSettings` is `{ enabled, order }`, where `order` is a list of page ids. On load, the page adds missing pages at the end and drops ids that match no page.

## Side Effects

- Each card writes only its own keys to `site_data`.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
