---
title: Ping Monitor
description: Monitor host reachability and latency with ICMP checks
---

Ping monitors run ICMP checks against one or more hosts and evaluate the combined result.

## Minimum setup {#minimum-setup}

Add at least one host entry with:

- `type`: `IP4` or `IP6`
- `host`
- `timeout` (ms)
- `count` (number of ping packets)

## Configuration fields {#configuration-fields}

| Field      | Type                               | Default            | Notes    |
| :--------- | :--------------------------------- | :----------------- | :------- |
| `hosts`    | `Array<{type,host,timeout,count}>` | one empty host row | Required |
| `pingEval` | `string` (JS function)             | built-in default   | Optional |

Default host values: `type=IP4`, `timeout=1000`, `count=3`.

## Default eval behavior {#default-eval}

Default logic:

- **UP** if all hosts are alive
- **DOWN** otherwise
- latency = average latency across hosts

## Custom eval contract {#custom-eval-contract}

Function input:

- `arrayOfPings`

Return object:

```javascript
{ status: "UP" | "DEGRADED" | "DOWN" | "MAINTENANCE", latency: number }
```

## Example {#example}

```json
{
    "type": "PING",
    "type_data": {
        "hosts": [{ "type": "IP4", "host": "8.8.8.8", "timeout": 1000, "count": 3 }]
    }
}
```

## Troubleshooting {#troubleshooting}

- **Validation fails**: host type must match detected address type
- **Frequent DOWN**: some networks/firewalls block ICMP
- **Noisy latency**: increase `count` or timeout to reduce false negatives
