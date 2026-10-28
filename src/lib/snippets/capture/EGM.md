# snippets/capture

## Overview

This folder holds eight browser JavaScript snippets, one for each analytics vendor. `src/routes/(kener)/capture.js/+server.ts` imports each file as raw text (Vite's `?raw` suffix). The route fills in the `{{token}}` placeholders from the saved analytics settings, and serves the enabled snippets as one script at `GET /capture.js`. An admin enables a vendor and sets its fields at `/manage/app/analytics-providers`.

## Interface

- `google-tag-manager.js` loads Google gtag.js for the settings key `analytics.googleTagManager`. Its tokens are `{{id}}`, `{{transport_url}}`, and `{{script_host}}`.
- `mixpanel.js` loads Mixpanel for `analytics.mixpanel`. Its tokens are `{{YOUR_PROJECT_TOKEN}}` and `{{api_host}}`.
- `amplitude.js` loads Amplitude with session replay for `analytics.amplitude`. Its tokens are `{{api_key}}` and `{{server_url}}`.
- `plausible.js` loads Plausible for `analytics.plausible`. Its tokens are `{{domain}}`, `{{api}}`, and `{{script_src}}`.
- `clarity.js` loads Microsoft Clarity for `analytics.clarity`. Its token is `{{project_id}}`.
- `umami.js` loads Umami for `analytics.umami`. Its tokens are `{{website_id}}` and `{{script_url}}`.
- `posthog.js` loads PostHog for `analytics.posthog`. Its tokens are `{{api_key}}` and `{{api_host}}`.
- `openpanel.js` loads OpenPanel for `analytics.openpanel`. Its tokens are `{{client_id}}`, `{{api_url}}`, and `{{script_url}}`.
- Every snippet except `clarity.js` listens on `window` for a CustomEvent named `analyticsEvent`. It sends `e.detail.event` and `e.detail.data` to its vendor. The default export of `src/lib/beacon.ts` (imported as `trackEvent`) dispatches this event on `document` and adds the prefix `kener_` to the event name.

## Invariants

- The files are not ES modules. They have no `import` or `export`, and each one starts with `// @ts-nocheck`. Never import them as code.
- The route joins the enabled snippets into one script with `;\n`, in a fixed order: Google Tag Manager, Mixpanel, Amplitude, Plausible, Clarity, Umami, PostHog, OpenPanel. So a snippet must not declare a top-level `let`, `const`, or `function`. Put new code inside an IIFE (an immediately invoked function expression), as most files do.
- A token has the form `{{name}}`. The route replaces every copy of a token with `replaceAll`.
- The route escapes each value for a double-quoted JavaScript string only. So every token must sit inside double quotes in the snippet.
- The route reads each value by its field label, for example `Measurement ID`. A new token or a new snippet needs a matching change in `src/routes/(kener)/capture.js/+server.ts` and a field in `src/routes/(manage)/manage/app/analytics-providers/+page.svelte`.
- `amplitude.js`, `google-tag-manager.js`, `plausible.js`, and `umami.js` load their vendor script in a `DOMContentLoaded` listener. They do not load it when `/capture.js` runs after that event.

## Side Effects

- In the browser, each snippet adds a vendor script tag:
    - `amplitude.js` loads `https://cdn.amplitude.com/script/{{api_key}}.js`.
    - `clarity.js` loads `https://www.clarity.ms/tag/{{project_id}}`.
    - `google-tag-manager.js` loads `{{script_host}}`, or `https://www.googletagmanager.com/gtag/js?id={{id}}` when `{{script_host}}` is empty.
    - `mixpanel.js` loads `//cdn.mxpnl.com/libs/mixpanel-2-latest.min.js`.
    - `openpanel.js` loads `{{script_url}}`.
    - `plausible.js` loads `{{script_src}}`.
    - `posthog.js` loads `/static/array.js` from the assets host of `{{api_host}}`.
    - `umami.js` loads `{{script_url}}`. The route uses `https://cloud.umami.is/script.js` when the field is empty.
- The snippets set the globals `window.dataLayer`, `window.mixpanel`, `window.posthog`, `window.clarity`, `window.op`, and `window.plausible`.
- The snippets do not set cookies or storage themselves. The vendor libraries that they load can do so.
- On the server, the route only reads the settings with `GetAllAnalyticsData()`. It writes nothing.

## Verification

- Run `npm run check` (svelte-kit sync and the svelte-check type check). The `// @ts-nocheck` line turns off type checks for these files.
- Run `npm test` (the full suite). No test covers this folder directly.
- To check a snippet by hand, enable its vendor at `/manage/app/analytics-providers`, then open `/capture.js` and look for the filled-in snippet.
