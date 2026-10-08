---
title: Heartbeat Monitor
description: Push health signals from jobs, workers, and external systems
---

Heartbeat monitors are push-based: your job calls a URL, and Kener measures how long it has been since the last signal.

## Heartbeat endpoint {#heartbeat-endpoint}

URL format:

```
/ext/heartbeat/{tag}/{secret}
```

Accepted methods: `GET` and `POST`.

> Older heartbeat URLs used a colon — `/ext/heartbeat/{tag}:{secret}`. Those still work; they are rewritten to the path-separated form automatically, so existing cron jobs need no changes.

## Heartbeat secret {#heartbeat-secret}

The `{secret}` part of the URL is the heartbeat secret. The monitor tag is public, so the secret is what stops others from sending fake heartbeats. Kener stores it in `type_data.secretString`.

Rule: at least 12 characters, using only `A-Z a-z 0-9 . _ ~ -`. A secret that follows the rule goes into the URL without encoding.

- **Admin UI**: type a value in **Heartbeat secret**, or click **New URL** for a random one.
- **API**: set `type_data.secretString` on `POST /api/v4/monitors` or `PATCH /api/v4/monitors/{tag}`. A new or changed value that breaks the rule returns HTTP `400` with code `BAD_REQUEST`, and the message starts with `Heartbeat secret breaks the rule`. See the [API Reference](/docs/spec/v4/).
- **Not set**: when a `HEARTBEAT` monitor is saved without `secretString`, Kener generates one, for example `focused-galois-sharp-chaum`. The `POST`/`PATCH` response includes it.
- **Clone**: a cloned heartbeat monitor gets a new secret. Give the sender the clone's URL.

> [!TIP]
> For infrastructure as code, set `secretString` yourself when you create the monitor. Then the sender (a cron job, a Prometheus Alertmanager rule) can be configured with the URL before the monitor exists.

Kener checks the rule only for a new or changed `secretString`. A secret stored before the rule keeps working, and a save that sends it back unchanged succeeds.

## Minimum setup {#minimum-setup}

Set:

- `degradedRemainingMinutes` (default `5`)
- `downRemainingMinutes` (default `10`)

`downRemainingMinutes` must be greater than `degradedRemainingMinutes`.

## Status logic {#status-logic}

If no heartbeat has ever been received:

- status is **NO_DATA**

Otherwise let `diff` = elapsed time since last heartbeat:

- `diff > downRemainingMinutes` → **DOWN**
- `diff > degradedRemainingMinutes` → **DEGRADED**
- otherwise → **UP**

Latency is recorded as elapsed time since the last heartbeat (ms).

## Example {#example}

Request body for `POST /api/v4/monitors`:

```json
{
    "tag": "my-job",
    "name": "My job",
    "monitor_type": "HEARTBEAT",
    "type_data": {
        "degradedRemainingMinutes": 5,
        "downRemainingMinutes": 10,
        "secretString": "my-job-hb-secret-01"
    }
}
```

Minimal cron usage pattern:

```bash
*/5 * * * * /path/to/job.sh && curl -s "https://your-kener-host/ext/heartbeat/my-job/my-job-hb-secret-01"
```

## Troubleshooting {#troubleshooting}

- **Always NO_DATA**: endpoint never called or wrong `tag`/`secret`
- **`Invalid heartbeat secret`**: the URL secret does not match `secretString`. Copy the URL again from the monitor page, or from the API response.
- **Always DOWN/DEGRADED**: thresholds too low for actual job interval
- **Signal accepted but stale**: ensure heartbeat is sent only after successful completion
