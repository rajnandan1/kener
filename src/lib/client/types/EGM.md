# client/types

## Overview

This folder holds TypeScript types for browser code. Both files are type-only. They export no runtime values, and nothing runs when a file is imported.

## Interface

- `ProviderRequirement` (`provider-settings.ts`) describes one settings field of a third-party provider: `label`, `type` (the HTML input type), `placeholder`, `required`, and `value`.
- `ProviderDefinition` (`provider-settings.ts`) describes one CAPTCHA or analytics provider: `label`, an optional `logo`, `key` (the site data key, for example `captcha.turnstile` or `analytics.posthog`), `isEnabled`, `activeInSite`, and `requirements` (a list of `ProviderRequirement`).
- `ThemeMode` (`ui.ts`) is the union `"light" | "dark" | "system"`.

## Invariants

- Three files import `ProviderDefinition`: `src/lib/components/manage/ProviderSettingsPanel.svelte`, `src/routes/(manage)/manage/app/analytics-providers/+page.svelte`, and `src/routes/(manage)/manage/app/captcha-providers/+page.svelte`. A change to its fields must reach all three.
- `ProviderSettingsPanel.svelte` stores each field value under the field's `label` text. `src/routes/(kener)/capture.js/+server.ts` reads the analytics values by the same text, for example `Measurement ID`. So a changed `label` breaks the link to values that are already stored.
- No file in `src` imports `ThemeMode` today.

## Side Effects

- None. The files contain only type declarations.

## Verification

- Run `npm run check` (svelte-kit sync and the svelte-check type check). It finds a consumer that does not follow a field change.
- Run `npm test` (the full suite). No test covers this folder directly. `src/lib/components/manage/ProviderSettingsPanel.svelte.test.ts` uses `ProviderDefinition`.
