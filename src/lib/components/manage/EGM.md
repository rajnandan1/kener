# components/manage

## Overview

This folder holds `ProviderSettingsPanel.svelte`, a shared admin panel for third-party providers. The panel lists CAPTCHA or analytics providers. An admin edits each provider's fields, enables or disables it, and saves it to the site data through `/manage/api`.

## Interface

- `ProviderSettingsPanel.svelte` takes these props:
    - `initialProviders: ProviderDefinition[]` (required) is the list of providers with their default field values. The type comes from `src/lib/client/types/provider-settings.ts`.
    - `description: string` (required) is the text above the panel.
    - `learnMoreUrl?: string` adds a "Learn more" link that opens in a new tab.
    - `enforceSingleActive?: boolean` (default `false`) allows only one enabled provider at a time.
- `src/routes/(manage)/manage/app/captcha-providers/+page.svelte` uses the panel with `enforceSingleActive`. `src/routes/(manage)/manage/app/analytics-providers/+page.svelte` uses it without that prop.

## Invariants

- The panel copies `initialProviders` once, when it mounts. A later change to the prop has no effect.
- After the load, each field shows the value that `getAllSiteData` returns. When that value is empty, it shows the default from `initialProviders`.
- For each `captcha.*` key, `getAllSiteData` masks `requirements["Secret Key"]` with `MaskSiteDataSecret` from `src/lib/server/controllers/siteDataController.ts`. So the CAPTCHA "Secret Key" field shows a mask, not the stored secret.
- A save that sends the masked "Secret Key" back keeps the stored secret, because `InsertKeyValue` calls `RestoreSiteDataSecret` for `captcha.*` keys. Only the `Secret Key` label of a `captcha.*` key gets this mask and restore. A new secret field needs its own path in `secretPath` in `src/lib/server/controllers/siteDataController.ts`.
- The save payload maps each provider `key` (for example `captcha.turnstile`) to a JSON string `{ requirements: { <label>: <value> }, isEnabled }`. Field values are keyed by their `label` text. `src/routes/(kener)/capture.js/+server.ts` reads the analytics values by the same labels, for example `Measurement ID`. Do not rename a label unless you also move the stored values.
- With `enforceSingleActive`, a save of an enabled provider also saves every other enabled provider with `isEnabled: false`. That save sends the other providers' fields as the panel holds them. So the panel refuses the save when the load failed, because the fields would then hold only the defaults and would overwrite the stored credentials.
- Only the HTML `required` attribute checks the required fields. Each input uses `req.type` as its HTML type, so a secret is hidden only when the caller passes `type: "password"`. The panel puts the loaded values into the inputs as it gets them. It does no masking of its own.

## Side Effects

- On mount, the panel sends POST `/manage/api` with the body `{ action: "getAllSiteData" }`.
- On save, the panel sends POST `/manage/api` with the body `{ action: "storeSiteData", data }`. This writes the site data that the status page and `/capture.js` read.
- The panel shows `svelte-sonner` toasts for a load error, a save error, and a successful save.

## Verification

- Run `npm run check` (svelte-kit sync and the svelte-check type check).
- Run `npm run test:client -- "src/lib/components/manage"`. The test runs in Chromium.
