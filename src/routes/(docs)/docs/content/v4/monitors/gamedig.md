---
title: GameDig Monitor
description: Monitor game server availability using the GameDig query protocol
---

GameDig monitors query game servers and evaluate the response.

## Minimum setup {#minimum-setup}

Set:

- `gameId`
- `host`
- `port`
- `timeout` (default `10000` ms)

Optional flags:

- `guessPort` (default `false`)
- `requestRules` (default `false`)

## Configuration fields {#configuration-fields}

| Field          | Type                   | Default            | Notes                                |
| :------------- | :--------------------- | :----------------- | :----------------------------------- |
| `gameId`       | `string`               | first game in list | Required                             |
| `host`         | `string`               | —                  | Required                             |
| `port`         | `number`               | `27015`            | Depends on game                      |
| `timeout`      | `number`               | `10000`            | Must be >= 2000 in form validation   |
| `guessPort`    | `boolean`              | `false`            | Allows alternate query port attempts |
| `requestRules` | `boolean`              | `false`            | Includes additional rules data       |
| `eval`         | `string` (JS function) | built-in default   | Optional                             |

## Default eval behavior {#default-eval}

If query succeeds, default eval returns:

- status **UP**
- latency = `responseTime`

If query fails or eval throws, monitor returns **DOWN**.

## Custom eval contract {#custom-eval-contract}

Function input:

- `responseTime`
- `responseRaw`

Return:

```javascript
{ status: "UP" | "DEGRADED" | "DOWN" | "MAINTENANCE", latency: number }
```

## Example {#example}

```json
{
    "type": "GAMEDIG",
    "type_data": {
        "gameId": "minecraft",
        "host": "mc.example.com",
        "port": 25565,
        "timeout": 10000,
        "guessPort": false,
        "requestRules": false
    }
}
```

## Troubleshooting {#troubleshooting}

- **Always DOWN**: wrong `gameId`/query port or blocked UDP/TCP query traffic
- **High latency**: increase timeout and verify server region/network path
- **Missing details**: enable `requestRules` for supported games
