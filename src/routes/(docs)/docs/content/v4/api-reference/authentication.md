---
title: Authentication
description: Learn how to authenticate with the Kener API using API keys and Bearer tokens
---

Every `/api/v4` request needs an API key in the `Authorization` header.

## Create an API key {#creating-an-api-key}

1. Sign in at `/manage`.
2. Open **API Keys**.
3. Click **Create New API Key** and enter a name.
4. Copy the key. Kener shows it only once.

## Use an API key {#using-api-keys}

```bash
curl https://your-kener.com/api/v4/monitors \
  -H "Authorization: Bearer $KENER_API_KEY"
```

A `200` response means the key works. Keep the key in an environment variable or a secret store, not in code.

## What a key can do {#key-access}

> [!WARNING]
> Every API key has full access to every `/api/v4` route. Kener has no per-key permissions and no key expiry yet. A key can create monitors, and a monitor's custom eval code runs on the Kener server. Treat every API key like an admin password.

API keys depend on [`KENER_SECRET_KEY`](/docs/v4/setup/environment-variables#kener-secret-key). If you change it, every existing key stops working, and you must create new keys.

## Deactivate or delete a key {#revoking-keys}

On the **API Keys** page, turn off a key's switch to deactivate it, or delete the key. Kener rejects a deactivated key until you turn it on again.

## Errors {#error-codes}

A missing, unknown, or deactivated key gets HTTP `401`:

```json
{
    "error": {
        "code": "UNAUTHORIZED",
        "message": "Invalid API key"
    }
}
```

A request with no `Bearer` header gets the message `Missing or invalid authorization header`.
