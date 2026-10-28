# subscription

## Overview

This folder serves `POST /dashboard-apis/subscription`. The status page uses it for the email subscription flow: a visitor asks for a code, verifies it, and then reads or changes which updates they get. A subscriber is a visitor who signed up for incident or maintenance emails.

## Interface

- `post.ts` exports the default handler `post(req: APIServerRequest)`. The JSON body field `action` selects one of four actions:
    - `login` takes `email` and `captchaToken`. It verifies the captcha, then calls `SubscriberLogin(email)`, which sends a verification code. It returns `{ success: true, message }`.
    - `verify` takes `email` and `code`. It calls `VerifySubscriberOTP(email, code)` and returns `{ success: true, token }`.
    - `getPreferences` takes `token`. It calls `VerifySubscriberToken(token)` and returns `{ success, email, subscriptions, availableSubscriptions }`.
    - `updatePreferences` takes `token` and the optional booleans `incidents` and `maintenances`. It calls `UpdateSubscriberPreferences(token, preferences)` and returns `{ success: true }`.

## Invariants

- The handler returns 400 for every action when the site setting `subscriptionsSettings` is missing or its `enable` flag is false (`post.ts:44-47`).
- The handler returns 400 when neither `methods.emails.incidents` nor `methods.emails.maintenances` is true (`post.ts:49-52`).
- `login` returns 400 `Captcha verification failed` when `VerifyCaptchaToken` fails, before it sends any email (`post.ts:86-89`).
- `getPreferences` returns 401 for an invalid token. The other failures return 400, with the controller's error message when it has one.
- `updatePreferences` keeps only the preferences whose email method is enabled in `subscriptionsSettings`, so a client cannot turn on a disabled event type (`post.ts:131-139`).
- An unknown `action` returns 400 `Invalid action`.

## Side Effects

- The handler reads the site setting through `GetSiteDataByKey("subscriptionsSettings")` from `src/lib/server/controllers/siteDataController.ts`.
- `login` calls `VerifyCaptchaToken` from `src/lib/server/controllers/captchaController.ts`. When a captcha provider is active, that function posts the token to the hCaptcha, reCAPTCHA, or Turnstile `siteverify` URL.
- The four actions call `src/lib/server/controllers/userSubscriptionsController.ts`. That controller writes the subscriber tables. `SubscriberLogin` sends the `subscription_account_code` email through `sendEmail`.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm run test:server -- "src/lib/server/api-server/subscription"`.
- The handler writes the database through its controller, so a change must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
