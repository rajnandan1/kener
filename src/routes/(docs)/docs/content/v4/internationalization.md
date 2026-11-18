---
title: Internationalization
description: Configure public and management panel languages, timezone behavior, and date/time formats.
---

Kener internationalization has three parts:

1. **Localization** (translated UI text)
2. **Timezone handling** (how date/time values are displayed)
3. **Date & time format** (how dates and times are formatted)

Use this page to configure all three from the admin UI.

## Quick setup {#quick-setup}

1. Open **Manage → Internationalization**.
2. In **Languages**:
    - select available locales,
    - pick a default locale,
    - click **Save Languages**.
3. In **Timezone Settings**:
    - enable or disable **Allow users to switch timezones**,
    - click **Save Timezone**.
4. In **Date & Time Format**:
    - set formats for **Date + Time**, **Date Only**, and **Time Only**,
    - click **Save Format**.

## Management panel language {#admin-panel-language}

Use the separate **Panel language** selector in the management header or on account pages to choose **English**, **Polski**, or **Čeština**. Labels change immediately.

The choice is stored for one year in the `kener_admin_locale` cookie, scoped to the application base path. An existing cookie takes priority; otherwise the panel follows a supported browser language and falls back to English. This is a browser preference, not a user-account setting.

**Internationalization → Languages** continues to control the public status page independently. Panel localization does not translate saved incident text, monitor names, editable email bodies, code examples, or protocol identifiers. On account pages, the built-in Documentation and Login links follow the panel language only when their original labels and destinations still match the defaults. Custom navigation labels and URLs remain unchanged.

Built-in editor controls, editor loading text, color-picker labels, and notification accessibility labels also follow the panel language. Date-format previews use the selected default public locale, so changing the panel language does not change those previews. Public locale names in the management form follow the panel language without changing the stored locale codes.

Panel catalogues live in `src/lib/admin-i18n/`. The shared registry in `languages.ts` supplies the selector, supported browser languages, translations, and date formats, including `LocalTime` timestamps in incident comments and user lists. English is the fallback for every registered language. The public-page translation scripts below do not audit the management panel.

### Contribute a panel language {#admin-panel-contribute}

1. Fork the repository and create a translation branch from a version containing panel localization.
2. Copy `src/lib/admin-i18n/en.json` to `<code>.json` and translate every value. Keep English keys, placeholder names such as `{value0}`, URLs, code, and technical confirmation phrases unchanged. Use a lowercase language code such as `de` or `pt-br`.
3. Import the catalogue and matching `date-fns/locale` locale into `src/lib/admin-i18n/languages.ts`, then add one registration. For example:

    ```ts
    import { de } from "date-fns/locale";
    import german from "./de.json";

    // Add to adminLanguages:
    { code: "de", label: "Deutsch", localeTag: "de-DE", dateLocale: de, messages: german },
    ```

    No other selector, cookie, resolver, or formatting changes are required. The native label is shown without translating it into other panel languages.

4. Run `node scripts/admin-i18n/audit.mjs`, `npm run check`, and `npm test`. The audit checks every catalogue for missing values and mismatched placeholders. Review intentionally unchanged technical text in `scripts/admin-i18n/technical-exceptions.json` with a reason. Valid native words that happen to match English, such as Czech “Role”, belong under that language code in `scripts/admin-i18n/locale-exceptions.json`; these exceptions do not exempt other languages.
5. Select the language and review account pages, forms, errors, dialogs, collapsed-menu tooltips, editor controls, dates, and a narrow mobile layout. Submit a pull request with screenshots and the checks performed. Language variants written right-to-left also need a layout review; registering a language does not add RTL layout support.

### Follow upstream releases {#admin-panel-upstream-updates}

Run the read-only release check from the repository root:

```bash
node scripts/admin-i18n/check-upstream.mjs
node scripts/admin-i18n/audit.mjs --report panel-translation-report.json
```

The release check compares the latest stable GitHub release, the checked-out version, and the last reviewed version recorded in `scripts/admin-i18n/source-inventory.json`. Network failures are reported as failures, not as proof that the translations are current. It does not install software, merge Git branches, or publish changes.

A version difference is an advisory audit warning. Missing translations and incorrect literal keys or placeholders still fail the audit. This keeps a release-number change from breaking an otherwise valid translation check while retaining a visible reminder to review new UI text.

For each stable release, merge the upstream tag into a dedicated update branch, review changed account/management screens and shared controls, update all registered catalogues, and run the audit, type checks, tests, and build. Check the changed screens in the browser. Only then update the inventory's reviewed version, tag, commit, and date, and submit the update for review. Keep unrelated fork branding and documentation on their existing branch.

## Localization {#localization}

### How it works {#localization-how-it-works}

- Locale files are JSON files in `src/lib/locales/`.
- Each locale file stores translations under `mappings`.
- Admin settings store:
    - selected locales,
    - default locale.

Only selected locales are exposed to users in the language selector.

### Add or update translations {#localization-add-update}

1. Edit the locale file(s) in `src/lib/locales/`.
2. Add missing keys under `mappings`.
3. Run translation checks.

Example locale shape:

```json
{
    "name": "English",
    "mappings": {
        "Status": "Status",
        "All Systems Operational": "All Systems Operational"
    }
}
```

### Validate localization {#localization-validate}

Run these from project root:

```bash
node scripts/check-translations.js
node scripts/sort-translations.js
```

- `check-translations` reports missing/unused keys.
- `sort-translations` normalizes key order in locale files.

## Timezone handling {#timezone}

### How it works {#timezone-how-it-works}

- Kener stores timestamps in UTC (Unix seconds).
- On the client, Kener detects browser timezone automatically.
- If timezone switching is enabled, users can change timezone manually from the public page controls.
- The admin dashboard (`/manage`) always uses your browser timezone and shows the GMT offset (for example `2026-08-20 12:02:00 GMT+8`); hover a time to see it in UTC.

### Admin toggle {#timezone-admin-toggle}

In **Manage → Internationalization**, the timezone switch controls whether manual timezone selection is shown to users:

- **ON**: users can switch timezones.
- **OFF**: users see auto-detected timezone behavior only.

### Server timezone variable {#timezone-server-variable}

Server-side timezone behavior is also affected by `TZ`.

For setup details, see: [/docs/v4/setup/environment-variables#timezone](/docs/v4/setup/environment-variables#timezone)

## Date & time format {#date-time-format}

Kener uses three separate format strings to display dates and times across the status page:

| Field           | Where it is used                                        | Default |
| --------------- | ------------------------------------------------------- | ------- |
| **Date + Time** | Incident timestamps, maintenance windows, event details | `PPp`   |
| **Date Only**   | Day headings, uptime history dates                      | `PP`    |
| **Time Only**   | Monitoring tick tooltips, time-only displays            | `p`     |

Set these in **Manage → Internationalization → Date & Time Format**. Type a format string directly or click a suggestion badge to fill the input.

### Format tokens {#format-tokens}

Formats use [date-fns `format` tokens](https://date-fns.org/docs/format). Common examples:

| Token        | Output example         | Notes                    |
| ------------ | ---------------------- | ------------------------ |
| `PP`         | Apr 29, 1453           | Locale-aware date        |
| `PPp`        | Apr 29, 1453, 12:00 AM | Locale-aware date + time |
| `yyyy-MM-dd` | 1453-04-29             | ISO date                 |
| `HH:mm`      | 14:30                  | 24-hour time             |
| `p`          | 12:00 AM               | Locale-aware time        |

### What does "Locale" mean? {#locale-format}

Tokens that start with an uppercase `P` (like `PP`, `PPp`) are **locale-aware** — they automatically adapt to the user's browser language. For example, `PP` renders as "Apr 29, 2025" in English but "29 avr. 2025" in French. Non-locale tokens like `yyyy-MM-dd` always produce the same output regardless of language.

> [!TIP]
> Kener does not display seconds anywhere in the UI. Avoid adding seconds tokens (`ss`, `pp` with seconds) to keep the interface clean. Use `PPp` instead of `PPpp`, and `p` or `HH:mm` instead of `pp` or `HH:mm:ss`.

## Stored settings reference {#stored-settings}

Kener saves internationalization settings in site data with keys like:

| Key                  | Purpose                                                                              |
| -------------------- | ------------------------------------------------------------------------------------ |
| `i18n.defaultLocale` | Default locale shown on first visit (unless user already has a language preference). |
| `i18n.locales[]`     | List of available locales and whether each one is selected.                          |
| `tzToggle`           | Enables/disables manual timezone switching in the public UI.                         |
| `dateAndTimeFormat`  | JSON object with `datePlusTime`, `dateOnly`, and `timeOnly` format strings.          |

## Verification checklist {#verification}

- Language selector shows only selected locales.
- Default language is used for first-time visits.
- `translation-report.json` has no unexpected missing keys.
- Time values render correctly for your locale/timezone.
- Timezone selector visibility matches your `tzToggle` setting.

## Troubleshooting {#troubleshooting}

- **Missing translation keys in report**
    - Add keys to all required locale files under `mappings`.
    - Re-run `node scripts/check-translations.js`.

- **Language not appearing in selector**
    - Make sure it is selected in **Manage → Internationalization**.
    - Save language settings.

- **Timezone selector not visible**
    - Enable **Allow users to switch timezones** and save.

- **Unexpected server-side time behavior**
    - Verify `TZ` is set as documented in [/docs/v4/setup/environment-variables#timezone](/docs/v4/setup/environment-variables#timezone).
