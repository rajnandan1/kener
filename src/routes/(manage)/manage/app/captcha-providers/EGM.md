# CAPTCHA Providers Page

## Overview

This route serves `/manage/app/captcha-providers`. It configures the CAPTCHA (a check that the visitor is a human) on the public subscribe form in `src/lib/components/SubscribeMenu.svelte`. It renders `$lib/components/manage/ProviderSettingsPanel.svelte` with three providers. The panel reads and writes site data: the key-value settings in the `site_data` table.

## Interface

- The page defines one provider entry per site data key: `captcha.hcaptcha` (hCaptcha), `captcha.recaptcha` (Google reCAPTCHA), and `captcha.turnstile` (Cloudflare Turnstile).
- Each provider needs a Site Key (a text field) and a Secret Key (a password field).
- The page sends no manage API action itself. `ProviderSettingsPanel` sends `getAllSiteData` (permission `settings.read`) and `storeSiteData` (permission `settings.write`) to the `POST /manage/api` endpoint.

## Invariants

- The layout guard in `src/routes/(manage)/+layout.server.ts` lets only users with `settings.read` open this route.
- Only one CAPTCHA provider can be active at a time. The page passes `enforceSingleActive` to the panel.
- With `enforceSingleActive`, a save that enables one provider also writes every other enabled provider with `isEnabled: false` in the same `storeSiteData` call. The panel refuses to enable a provider when the stored values failed to load.
- The `getAllSiteData` read masks each provider's `Secret Key`, and `InsertKeyValue` puts the stored secret back when a save sends the masked value. `secretPath` in `src/lib/server/controllers/siteDataController.ts` finds the secret by the label `Secret Key`, so the label must stay the same.
- Every provider starts with `isEnabled: false`, `activeInSite: false`, and empty values until the panel loads the stored values.

## Side Effects

- `storeSiteData` writes the provider keys to `site_data`.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
