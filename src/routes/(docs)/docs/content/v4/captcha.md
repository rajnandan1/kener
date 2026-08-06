---
title: Captcha
description: Protect the public subscribe form from automated abuse with a CAPTCHA provider
---

Kener can require a CAPTCHA challenge before sending subscribe verification emails. Go to **Manage → Captcha Providers** to configure any of the supported providers.

## How it works {#how-it-works}

When a provider is enabled, Kener renders its widget on the public subscribe form and verifies the solved token server-side before sending the OTP email. Only one provider can be active at a time — enabling one disables the others. With no provider enabled, the subscribe form works as before.

## Supported providers {#supported-providers}

| Provider             | Key                 |
| --------------------- | -------------------- |
| hCaptcha              | `captcha.hcaptcha`   |
| Google reCAPTCHA      | `captcha.recaptcha`  |
| Cloudflare Turnstile  | `captcha.turnstile`  |

---

## hCaptcha {#hcaptcha}

| Field      | Required | Example                                          |
| ---------- | -------- | ------------------------------------------------- |
| Site Key   | Yes      | `10000000-ffff-ffff-ffff-000000000001`             |
| Secret Key | Yes      | `0x0000000000000000000000000000000000000`          |

Create a site at [hCaptcha](https://dashboard.hcaptcha.com/sites/new) to get your **Site Key** and **Secret Key**.

---

## Google reCAPTCHA {#google-recaptcha}

| Field      | Required | Example |
| ---------- | -------- | ------- |
| Site Key   | Yes      | `6Lc...` |
| Secret Key | Yes      | `6Lc...` |

Register a site at the [reCAPTCHA admin console](https://www.google.com/recaptcha/admin/create) using the **reCAPTCHA v2 "I'm not a robot" Checkbox** type to get your **Site Key** and **Secret Key**.

---

## Cloudflare Turnstile {#cloudflare-turnstile}

| Field      | Required | Example        |
| ---------- | -------- | --------------- |
| Site Key   | Yes      | `0x4AAAAAAA...` |
| Secret Key | Yes      | `0x4AAAAAAA...` |

Add a widget in the [Cloudflare dashboard](https://dash.cloudflare.com/?to=/:account/turnstile) under **Turnstile** to get your **Site Key** and **Secret Key**.

---

## Enable a provider {#enable-a-provider}

1. Go to **Manage → Captcha Providers**.
2. Select the provider from the left panel.
3. Fill in the **Site Key** and **Secret Key**.
4. Set **Status** to **Enable**.
5. Click **Save Changes**.

A green dot next to the provider name indicates it is active on the public site.

> [!NOTE]
> Changes take effect immediately — no restart required.
