---
title: SSL Monitor
description: Monitor TLS certificate expiry with degraded/down thresholds
---

SSL monitors open a TLS connection, read the peer certificate expiry date, and map remaining time to monitor status.

## Minimum setup {#minimum-setup}

Set:

- `host`
- `port` (default `443`)
- `degradedRemainingHours` (default `168`)
- `downRemainingHours` (default `24`)

`degradedRemainingHours` must be greater than `downRemainingHours`.

## Status logic {#status-logic}

Let `hours` = hours until certificate expiry:

- `hours > degradedRemainingHours` → **UP**
- `downRemainingHours < hours <= degradedRemainingHours` → **DEGRADED**
- `hours <= downRemainingHours` → **DOWN**

Connection/certificate retrieval errors also return **DOWN**.

## Configuration fields {#configuration-fields}

| Field                    | Type     | Default | Notes                          |
| :----------------------- | :------- | :------ | :----------------------------- |
| `host`                   | `string` | —       | Required                       |
| `port`                   | `string` | `443`   | Numeric string accepted        |
| `degradedRemainingHours` | `number` | `168`   | Must be > `downRemainingHours` |
| `downRemainingHours`     | `number` | `24`    |                                |

## Example {#example}

```json
{
    "type": "SSL",
    "type_data": {
        "host": "example.com",
        "port": "443",
        "degradedRemainingHours": 168,
        "downRemainingHours": 24
    }
}
```

## Troubleshooting {#troubleshooting}

- **Immediate DOWN**: wrong host/port or TLS unavailable
- **Validation fails**: ensure degraded threshold is strictly greater than down threshold
- **Unexpected expiry result**: verify served certificate/SNI for that host
