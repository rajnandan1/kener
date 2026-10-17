# Locales

Each language is one file, `src/lib/locales/{code}.json`, with two keys: `name` (the language's display name) and `mappings` (the English string, then its translation). The server (`src/lib/server/i18n.ts`) and the client (`src/lib/stores/i18n.ts`) read every file in the folder, so a new file needs no registration.

`node scripts/check-translations.js` finds the `$t("...")` strings in `src/` and writes `translation-report.json` with the missing and unused keys of each locale.
