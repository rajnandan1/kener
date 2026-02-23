---
title: Internationalization
description: Configure language localization and timezone behavior for your Kener status page.
---

Kener internationalization has two parts:

1. **Localization** (translated UI text)
2. **Timezone handling** (how date/time values are displayed)

Use this page to configure both from the admin UI and keep translations complete.

## Quick setup {#quick-setup}

1. Open **Manage → Internationalization**.
2. In **Languages**:
    - select available locales,
    - pick a default locale,
    - click **Save Languages**.
3. In **Timezone Settings**:
    - enable or disable **Allow users to switch timezones**,
    - click **Save Timezone**.

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

### Admin toggle {#timezone-admin-toggle}

In **Manage → Internationalization**, the timezone switch controls whether manual timezone selection is shown to users:

- **ON**: users can switch timezones.
- **OFF**: users see auto-detected timezone behavior only.

### Server timezone variable {#timezone-server-variable}

Server-side timezone behavior is also affected by `TZ`.

For setup details, see: [/docs/v4/setup/environment-variables#timezone](/docs/v4/setup/environment-variables#timezone)

## Stored settings reference {#stored-settings}

Kener saves internationalization settings in site data with keys like:

| Key                  | Purpose                                                                              |
| -------------------- | ------------------------------------------------------------------------------------ |
| `i18n.defaultLocale` | Default locale shown on first visit (unless user already has a language preference). |
| `i18n.locales[]`     | List of available locales and whether each one is selected.                          |
| `tzToggle`           | Enables/disables manual timezone switching in the public UI.                         |

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
