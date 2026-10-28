# Public Captcha Config

## Overview

This route serves `GET /captcha-config.json`. It tells the browser which captcha provider is active and gives the public site key, so the browser can show the captcha challenge. The `(kener)` route group adds no URL segment.

## Interface

- `+server.ts` exports `GET`. It returns `json(await GetPublicCaptchaConfig())`.
- `GetPublicCaptchaConfig` in `src/lib/server/controllers/captchaController.ts` reads the `site_data` rows with keys `captcha.hcaptcha`, `captcha.recaptcha`, and `captcha.turnstile`.
- The response body is `{ provider, siteKey, misconfigured }`. `provider` is `"hcaptcha"`, `"recaptcha"`, `"turnstile"`, or `null`.

## Invariants

- The response never contains the secret key. It contains only the provider name and the site key.
- An enabled provider with a missing site key or secret key gives `misconfigured: true` with `provider: null`. The browser must keep the form blocked in this state, because `VerifyCaptchaToken` in `src/lib/server/controllers/captchaController.ts` also fails closed for it.
- The route does no sign-in check. Anyone can read it.

## Side Effects

- The handler reads the `site_data` table. It writes nothing.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm run test:server -- "src/routes/(kener)/captcha-config.json"`.
- The code reads the database, so a change must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
