---
title: TCP Monitor
description: Monitor TCP port availability for hosts and services
---

TCP monitors test whether target ports are reachable (`open`, `timeout`, or `error`).

## Minimum setup {#minimum-setup}

Add at least one host entry:

- `type`: `IP4` or `IP6`
- `host`
- `port`
- `timeout` in ms

## Configuration fields {#configuration-fields}

| Field     | Type                              | Default            | Notes    |
| :-------- | :-------------------------------- | :----------------- | :------- |
| `hosts`   | `Array<{type,host,port,timeout}>` | one empty host row | Required |
| `tcpEval` | `string` (JS function)            | built-in default   | Optional |

Default host values: `type=IP4`, `port=80`, `timeout=1000`.

## Default eval behavior {#default-eval}

Default logic:

- **UP** if every host result has `status === "open"`
- **DOWN** otherwise
- latency = average host latency

## Custom eval contract {#custom-eval-contract}

Function input:

- `arrayOfPings` (TCP results)

Return object:

```javascript
{ status: "UP" | "DEGRADED" | "DOWN" | "MAINTENANCE", latency: number }
```

## Example {#example}

```json
{
    "type": "TCP",
    "type_data": {
        "hosts": [{ "type": "IP4", "host": "db.example.com", "port": 5432, "timeout": 2000 }]
    }
}
```

## Troubleshooting {#troubleshooting}

- **Timeout**: network path/firewall issue or slow target
- **Error**: wrong host/port or service not listening
- **Validation fails**: host type and address format must match
