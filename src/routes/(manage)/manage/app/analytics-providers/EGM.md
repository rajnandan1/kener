# Analytics Providers Page

## Overview

This route serves `/manage/app/analytics-providers`. It turns on and configures the web analytics scripts that the public status page loads. It renders `$lib/components/manage/ProviderSettingsPanel.svelte` with a fixed list of providers. The panel reads and writes site data: the key-value settings in the `site_data` table.

## Interface

- The page defines one provider entry per site data key: `analytics.googleTagManager`, `analytics.plausible`, `analytics.mixpanel`, `analytics.amplitude`, `analytics.clarity`, `analytics.umami`, `analytics.posthog`, and `analytics.openpanel`.
- Each entry has a `label`, a `logo`, a `key`, `isEnabled`, `activeInSite`, and a list of `requirements` (the input fields).
- The page sends no manage API action itself. `ProviderSettingsPanel` sends `getAllSiteData` (permission `settings.read`) and `storeSiteData` (permission `settings.write`) to the `POST /manage/api` endpoint.

## Invariants

- The layout guard in `src/routes/(manage)/+layout.server.ts` lets only users with `settings.read` open this route.
- More than one analytics provider can be active at the same time. The panel does not get `enforceSingleActive`.
- Every field is a plain text input. No value here is masked.
- Some fields have defaults. For example, the Plausible API is `https://plausible.io/api/event`, the Umami script is `https://cloud.umami.is/script.js`, and the PostHog host is `https://us.i.posthog.com`.
- A new provider key must also go in `src/lib/server/controllers/siteDataKeys.ts`. Otherwise `InsertKeyValue` in `src/lib/server/controllers/siteDataController.ts` rejects the save.

## Side Effects

- `storeSiteData` writes the provider keys to `site_data`.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
