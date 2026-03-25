---
title: Analytics
description: Connect analytics providers to track traffic on your public status page
---

Kener supports injecting analytics scripts into the public status page. Go to **Manage → Analytics Providers** to configure any of the supported providers.

## How it works {#how-it-works}

When a provider is enabled, Kener injects its tracking script into every public status page response via `/capture.js`. Multiple providers can be active simultaneously.

## Supported providers {#supported-providers}

| Provider          | Key                          |
| ----------------- | ---------------------------- |
| Google Analytics  | `analytics.googleTagManager` |
| Plausible         | `analytics.plausible`        |
| Mixpanel          | `analytics.mixpanel`         |
| Amplitude         | `analytics.amplitude`        |
| Microsoft Clarity | `analytics.clarity`          |
| Umami             | `analytics.umami`            |
| PostHog           | `analytics.posthog`          |

---

## Google Analytics {#google-analytics}

Uses Google Tag Manager / gtag.js.

| Field          | Required | Example                                                     |
| -------------- | -------- | ----------------------------------------------------------- |
| Measurement ID | Yes      | `G-S05E5E5E5E5`                                             |
| Transport URL  | No       | `https://www.google-analytics.com`                          |
| Script Host    | No       | `https://www.googletagmanager.com/gtag/js?id=G-S05E5E5E5E5` |

**Measurement ID** is found in your Google Analytics property under **Admin → Data Streams → Web → Measurement ID**.

**Script Host** is the full URL of the gtag.js script to load, including the `?id=` query parameter. Leave it empty to use Google's default CDN (`https://www.googletagmanager.com/gtag/js?id=<your-id>`). Set a custom URL if you proxy the script through your own domain, e.g. `https://your-proxy.example.com/gtag/js?id=G-XXXXXXXXXX`.

Leave **Transport URL** empty to send hits directly to Google Analytics.

> [!TIP]
> Ad blockers commonly block requests to `www.googletagmanager.com` and `www.google-analytics.com`. Use [Saki](https://saki.rajnandan.com/) — a self-hostable Nginx proxy — to route through your own domain:
>
> - **Script Host**: `https://saki.rajnandan.com/tg/script.js?id=G-XXXXXXXXXX`
> - **Transport URL**: `https://saki.rajnandan.com/an/`

---

## Plausible {#plausible}

Privacy-friendly analytics with no cookies.

| Field         | Required | Example                                                          |
| ------------- | -------- | ---------------------------------------------------------------- |
| Domain        | Yes      | `kener.ing`                                                      |
| API           | Yes      | `https://plausible.io/api/event`                                 |
| Script Source | Yes      | `https://plausible.io/js/script.pageview-props.tagged-events.js` |

**Domain** must match exactly what you registered at plausible.io. For self-hosted Plausible, replace the **API** and **Script Source** URLs with your instance's host.

---

## Mixpanel {#mixpanel}

| Field         | Required | Example                    |
| ------------- | -------- | -------------------------- |
| Project Token | Yes      | `abc123def456`             |
| API Host      | No       | `https://api.mixpanel.com` |

Find your **Project Token** in Mixpanel under **Settings → Project Settings**. Leave **API Host** empty to use the default Mixpanel endpoint.

> [!TIP]
> To bypass ad blockers, use [Saki](https://saki.rajnandan.com/). Set **API Host** to `https://saki.rajnandan.com/mxa/`.

---

## Amplitude {#amplitude}

| Field             | Required | Example                                |
| ----------------- | -------- | -------------------------------------- |
| Amplitude API Key | Yes      | `a1b2c3d4e5f6...`                      |
| Server URL        | No       | `https://api2.amplitude.com/2/httpapi` |

Find your **Amplitude API Key** under **Settings → Projects → [Your Project] → General**. Leave **Server URL** empty to use Amplitude's default. Use `https://api.eu.amplitude.com/2/httpapi` for EU data residency.

> [!TIP]
> To bypass ad blockers, use [Saki](https://saki.rajnandan.com/). Set **Server URL** to `https://saki.rajnandan.com/aapi/2/httpapi`.

---

## Microsoft Clarity {#microsoft-clarity}

| Field      | Required | Example      |
| ---------- | -------- | ------------ |
| Project ID | Yes      | `abc1234xyz` |

Find your **Project ID** in Microsoft Clarity under **Settings → Overview → Tracking Code** (the value after `clarity.ms/tag/`).

---

## Umami {#umami}

Self-hostable, cookie-free analytics.

| Field      | Required | Example                                |
| ---------- | -------- | -------------------------------------- |
| Website ID | Yes      | `5e1c3b29-3f7d-4f2a-8e6b-d3f1a2b3c4d5` |
| Script URL | Yes      | `https://cloud.umami.is/script.js`     |

Find your **Website ID** in Umami under **Settings → Websites**. For self-hosted Umami, replace the **Script URL** with your instance URL, e.g. `https://umami.example.com/script.js`.

---

## PostHog {#posthog}

Product analytics with session recordings.

| Field    | Required | Example                    |
| -------- | -------- | -------------------------- |
| API Key  | Yes      | `phc_xxxxxxxxxxxxxxxxxxxx` |
| API Host | Yes      | `https://us.i.posthog.com` |

Find your **API Key** in PostHog under **Settings → Project → Project API key**. Set **API Host** to `https://eu.i.posthog.com` for the EU cloud, or your self-hosted PostHog URL.

> [!TIP]
> To bypass ad blockers, use [Saki](https://saki.rajnandan.com/). Set **API Host** to `https://saki.rajnandan.com/pha/`.

---

## Enable a provider {#enable-a-provider}

1. Go to **Manage → Analytics Providers**.
2. Select the provider from the left panel.
3. Fill in the required fields.
4. Set **Status** to **Enable**.
5. Click **Save Changes**.

A green dot next to the provider name indicates it is active on the public site.

> [!NOTE]
> Changes take effect immediately — no restart required.
