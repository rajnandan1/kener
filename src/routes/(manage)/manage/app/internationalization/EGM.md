# Internationalization Page

## Overview

This route serves `/manage/app/internationalization`. It sets the languages of the public status page, the visitor time zone switch, and the date and time formats. It reads and writes site data (the key-value settings in the `site_data` table) through the manage API: the `POST /manage/api` endpoint, which checks a permission for each action.

## Interface

- The page sends `getAllSiteData` (permission `settings.read`) and reads the keys `i18n`, `tzToggle`, and `dateAndTimeFormat`.
- "Save Languages" sends `storeSiteData` (permission `settings.write`) with `i18n` as a JSON string of `{ defaultLocale, locales }`.
- "Save Timezone" sends `storeSiteData` with `tzToggle`.
- "Save Format" sends `storeSiteData` with `dateAndTimeFormat` as a JSON string of `{ datePlusTime, dateOnly, timeOnly }`.

## Invariants

- The layout guard in `src/routes/(manage)/+layout.server.ts` lets only users with `settings.read` open this route.
- The defaults are `tzToggle` `NO`, the formats `PPpp`, `PP`, and `pp` (date-fns tokens), and the default locale `en`.
- `tzToggle` is `YES` or `NO`.
- The page rebuilds the locale list from the locale files the app ships. It drops a stored locale that has no file.
- The user cannot uncheck the default locale. The default-language picker offers only selected locales.
- The page does not check the format strings before a save. The preview shows "Invalid format" when date-fns cannot use one.
- Each card saves only its own key.

## Side Effects

- `storeSiteData` writes `i18n`, `tzToggle`, or `dateAndTimeFormat` to `site_data`.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
