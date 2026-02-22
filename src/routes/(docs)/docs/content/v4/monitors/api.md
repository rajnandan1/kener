---
title: API Monitor
description: Monitor HTTP/HTTPS endpoints with custom methods, payloads, and eval logic
---

API monitors send HTTP requests and evaluate the response with JavaScript.

## Minimum setup {#minimum-setup}

1. Set `url`
2. Choose `method` (default `GET`)
3. Set `timeout` (default `10000` ms)
4. Save (optional: custom `eval` function)

## Configuration fields {#configuration-fields}

| Field                 | Type                                           | Default          | Notes                         |
| :-------------------- | :--------------------------------------------- | :--------------- | :---------------------------- |
| `url`                 | `string`                                       | —                | Required                      |
| `method`              | `GET\|POST\|PUT\|PATCH\|DELETE\|HEAD\|OPTIONS` | `GET`            |                               |
| `headers`             | `{ key, value }[]`                             | `[]`             | Optional custom headers       |
| `body`                | `string`                                       | `""`             | Sent for non-GET/HEAD methods |
| `timeout`             | `number`                                       | `10000`          | Request timeout in ms         |
| `allowSelfSignedCert` | `boolean`                                      | `false`          | Disables TLS verify when true |
| `eval`                | `string` (JS function)                         | built-in default | Receives response details     |

## Default eval behavior {#default-eval}

Built-in eval marks the monitor **UP** when:

- status code is `429`, or
- status code is in `2xx` or `3xx`

Otherwise it returns **DOWN**.

## Custom eval contract {#custom-eval-contract}

Your function receives:

- `statusCode`
- `responseTime`
- `responseRaw`
- `modules` (currently includes `cheerio`)

It must return:

```javascript
{ status: "UP" | "DEGRADED" | "DOWN" | "MAINTENANCE", latency: number }
```

## Example {#example}

```json
{
    "type": "API",
    "type_data": {
        "url": "https://api.example.com/health",
        "method": "GET",
        "timeout": 10000
    }
}
```

## Troubleshooting {#troubleshooting}

- **Always DOWN**: verify URL/method/headers/body
- **TLS errors**: enable `allowSelfSignedCert` only for trusted self-signed endpoints
- **Eval errors**: simplify eval and validate return shape
