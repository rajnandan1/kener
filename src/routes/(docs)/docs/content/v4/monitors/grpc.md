---
title: gRPC Health Check Monitor
description: Monitor gRPC services using the standard Health Checking Protocol
---

gRPC monitors call the standard [gRPC Health Checking Protocol](https://grpc.io/docs/guides/health-checking/) (`grpc.health.v1.Health/Check`) and map the response to monitor status.

## Minimum setup {#minimum-setup}

Set:

- `host`
- `port` (default `50051`)

Optionally set `service` to check a specific service name instead of overall server health.

## Status logic {#status-logic}

The `ServingStatus` from the health check response maps to:

- `SERVING` → **UP**
- `NOT_SERVING` → **DOWN**
- `UNKNOWN` / `SERVICE_UNKNOWN` → **DEGRADED**

Connection errors and timeouts return **DOWN**.

## Configuration fields {#configuration-fields}

| Field     | Type      | Default | Notes                                          |
| :-------- | :-------- | :------ | :--------------------------------------------- |
| `host`    | `string`  | —       | Required                                       |
| `port`    | `number`  | `50051` | Required                                       |
| `service` | `string`  | `""`    | Fully qualified service name; empty = overall   |
| `tls`     | `boolean` | `false` | Use TLS credentials                            |
| `timeout` | `number`  | `10000` | Request deadline in ms                         |

## Example {#example}

```json
{
    "type": "GRPC",
    "type_data": {
        "host": "grpc.example.com",
        "port": 50051,
        "service": "my.package.MyService",
        "tls": true,
        "timeout": 5000
    }
}
```

## Troubleshooting {#troubleshooting}

- **Immediate DOWN**: wrong host/port, service not running, or firewall blocking the connection
- **DEGRADED**: server returned `UNKNOWN` or `SERVICE_UNKNOWN` — verify the service name is registered
- **Timeout**: increase `timeout` or check network latency to the gRPC server
- **TLS errors**: ensure the server has a valid certificate, or check if TLS should be disabled
