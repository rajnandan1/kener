---
title: Gamedig Monitors | Kener
description: Monitor games and services
---

Gamedig monitors are used to monitor games and services. Currently, 320+ games and some services are available. You can view the entire list [here](https://github.com/gamedig/node-gamedig/blob/HEAD/GAMES_LIST.md). More than just the state of the game/service, it provides information about your game/service, such as players list, world name, connection method, and so on.

<div class="border rounded-md">

![Monitors Gamedig](/documentation/m_gamedig.png)

</div>

## Host {#host}

<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

The host is the domain name, IPv4 or IPv6 of the game/service you want to monitor. The host should be valid.

## Port {#port}

<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

The port is the query port of the game/service you want to monitor. Some games use a port, different from the one to connect, to accept queries, such as Minecraft with `query-port`.
If you do not know the query port, you can let the monitor guess the port by checking the option `Guess port`.

## Timeout {#timeout}

<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

The timeout is used to define the time in milliseconds after which the monitor should timeout. If the monitor does not respond within the timeout period, the monitor will be marked as down. For example, 10000 will set the timeout to 10 seconds. It is required and has to be a number greater than 2000 (or 2 seconds).

## Request additional rules {#request-additional-rules}

Valve games can provide additional 'rules' to Gamedig monitors. If checked, they will be available in `reponseRaw.raw` (see [Eval](#eval)), beware that it may increase query time.

## Eval {#eval}

The eval is used to define the JavaScript code that should be used to evaluate the response. It is optional and has be a valid JavaScript code.

This is an anonymous JS function, it should return a **Promise**, that resolves or rejects to `{status, latency}`, by default it looks like this.

> **_NOTE:_** The eval function should always return a json object. The json object can have only status(UP/DOWN/DEGRADED) and latency(number)
> `{status: "DEGRADED", latency: 200}`.

```javascript
;(async function (responseTime, responseRaw) {
    return {
        status: "UP",
        latency: responseTime
    }
})
```

- `responseTime` **REQUIRED** is a number. It is the latency in milliseconds
- `responseRaw` **REQUIRED** is the raw response of the game/service. It varies from game by game, we recommend first printing responseRaw with a simple `console.log`.

## Additional notes {#additional-notes}

Some games/services need more configuration on their part to accept correctly any query of the monitor. You can consult these notes [here](https://github.com/gamedig/node-gamedig/blob/HEAD/GAMES_LIST.md#games-with-additional-notes).
