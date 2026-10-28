# stores

## Overview

This folder holds the Svelte stores (from `svelte/store`) for the viewer's language, timezone, and date formatting. The status page, the embed pages, and many components read them. `GetLayoutClientData` in `src/lib/client/layoutClientData.ts` initialises the `i18n` and `timezone` stores. About 34 files import from this folder.

## Interface

- `i18n` (`i18n.ts`) is a writable store of `I18nStore` (`currentLocale`, `translations`, `availableLocales`, `isLoading`). It has these methods:
    - `init(availableLocales, defaultLocale, fetchFn)` picks the locale and loads its translations.
    - `loadTranslations(locale)` loads the `mappings` of one locale.
    - `setLocale(locale)` saves the choice and loads it.
    - `t(key)` returns one translation, without reactivity.
    - `reset()` restores the default state.
- `t` (`i18n.ts`) is a derived store that holds a function. Components call it as `$t("key")` or `$t("key", { name: "value" })`.
- `i18n.ts` also exports the derived stores `currentLocale` and `translations`, the list `availableLocalesList` (`{ code, name }` for each locale file, sorted by name), and the types `LocaleInfo` and `I18nStore`.
- `timezone` (`timezone.ts`) is a writable store of `TimezoneStore` (`selectedTimezone`, `availableTimezones`) with the methods `init()`, `setTimezone(tz)`, and `reset()`. `selectedTimezone` and `availableTimezones` are derived stores.
- `datetime.ts` exports the functions `getDateFnsLocale(code)`, `parseDateInput(date)`, and `formatDateTz(date, formatStr, tz?, locale?)`. It also exports the derived stores `dateFnsLocale`, `formatDate` (call it as `$formatDate(ts, "PPpp")`), and `formatDuration` (call it as `$formatDuration(start, end, ongoingText)`).

## Invariants

- `i18n.ts` loads every `src/lib/locales/*.json` file at build time with `import.meta.glob` (eager). A new locale file needs no registration. Each file has a `name` and a `mappings` object.
- The fallback locale is `en`. An unknown locale loads the `en` translations. A missing key returns the key itself, and `$t` logs a `console.warn`.
- `$t` replaces each `%name` placeholder with `args.name`. It leaves a placeholder that has no matching argument as it is.
- `setLocale` ignores a code that is not in `availableLocales`. `setTimezone` ignores a timezone that is not `UTC` and not in `availableTimezones`.
- `init` reads a saved choice from localStorage first. The locale then falls back to `defaultLocale` from the site settings. The timezone falls back to the browser timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`).
- `parseDateInput` reads a number below 10000000000 as Unix seconds and a larger number as milliseconds. It reads a `YYYY-MM-DD HH:mm:ss` string (the database format) as UTC. `formatDuration` uses the same seconds rule.
- `getDateFnsLocale` tries the full code, then the language part before `-`, then `enUS`. A new locale whose dates need their own date-fns locale needs an entry in `localeMap` in `datetime.ts`.
- The stores live at module level. On the server, every request shares the same instance.

## Side Effects

- `i18n.init` reads the localStorage key `kener_preferred_locale`, and `setLocale` writes it.
- `timezone.init` reads the localStorage key `kener_preferred_timezone`. It writes the browser timezone there when no valid value is saved. `setTimezone` writes the key.
- The stores touch localStorage only when `window` exists.
- `i18n.ts` logs to the console when a translation or a locale is missing.

## Verification

- Run `npm run check` (svelte-kit sync and the svelte-check type check).
- Run `npm run test:server -- "src/lib/stores"`.
