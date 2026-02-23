---
title: Heartbeat Monitor
description: Push health signals from jobs, workers, and external systems
---

Heartbeat monitors are push-based: your job calls a URL, and Kener measures how long it has been since the last signal.

## Heartbeat endpoint {#heartbeat-endpoint}

URL format:

```
/ext/heartbeat/{tag}:{secret}
```

Accepted methods: `GET` and `POST`.

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

```json
{
    "type": "HEARTBEAT",
    "type_data": {
        "degradedRemainingMinutes": 5,
        "downRemainingMinutes": 10
    }
}
```

Minimal cron usage pattern:

```bash
*/5 * * * * /path/to/job.sh && curl -s "https://your-kener-host/ext/heartbeat/my-job:my-secret"
```

## Troubleshooting {#troubleshooting}

- **Always NO_DATA**: endpoint never called or wrong `tag:secret`
- **Always DOWN/DEGRADED**: thresholds too low for actual job interval
- **Signal accepted but stale**: ensure heartbeat is sent only after successful completion
