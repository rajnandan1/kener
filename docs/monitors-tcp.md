---
title: TCP Monitors | Kener
description: Learn how to set up and work with TCP monitors in kener.
---

# TCP Monitors

TCP monitors are used to monitor the liveness of your servers. You can use TCP monitors to monitor the uptime of your servers and get notified when they are down.

<div class="border rounded-md">

![Monitors TCP](/documentation/m_tcp.png)

</div>

## Hosts

You can add as many hosts as you want to monitor. The host can be an IP(IP4 and IP6) address or a domain name.

- Type: Choose the type of host you want to monitor. It can be either `IP4` or `IP6` or `DOMAIN`.
- Host: Enter the IP address or domain name of the host you want to monitor.
- Port: Enter the port number of the host you want to monitor.
- Timeout: Enter the timeout in milliseconds for each ping request of each host

## Eval

The eval is used to define the JavaScript code that should be used to evaluate the response. It is optional and has be a valid JavaScript code.

This is an anonymous JS function, it should return a **Promise**, that resolves or rejects to `{status, latency}`, by default it looks like this.

> **_NOTE:_** The eval function should always return a json object. The json object can have only status(UP/DOWN/DEGRADED) and latency(number)
> `{status:"DEGRADED", latency: 200}`.

```javascript
(async function (arrayOfPings) {
    let latencyTotal = arrayOfPings.reduce((acc, ping) => {
        return acc + ping.latency
    }, 0)

    let alive = arrayOfPings.reduce((acc, ping) => {
        if (ping.status === "open") {
            return acc && true
        } else {
            return false
        }
    }, true)

    return {
        status: alive ? "UP" : "DOWN",
        latency: latencyTotal / arrayOfPings.length
    }
})
```

- `arrayOfPings` **REQUIRED** is an array of TCP Response Objects as shown below.

```json
/*
[
  {
    status: 'open',
    latency: 31.93,
    host: '66.51.120.219',
    port: 465,
    type: 'IP4'
  },
  {
    status: 'open',
    latency: 47.041417,
    host: '2404:6800:4003:c1c::66',
    port: 80,
    type: 'IP6'
  },
  {
    status: 'open',
    latency: 82.1865,
    host: 'rajnandan.com',
    port: 80,
    type: 'DOMAIN'
  }
]
*/
```

### Understanding the Input

Each object in the array represents the tcp response of a host.

- `host`: The host that was pinged.
- `port`: The port that was pinged. Defaults to 80 if not provided.
- `type`: The type of IP address. Can be `IP4` or `IP6`.
- `status`: The status of the ping. Can be `open` , `error` or `timeout`.
    - `open`: The host is reachable.
    - `error`: There was an error while pinging the host.
    - `timeout`: The host did not respond in time.
- `latency`: The time taken to ping the host. This is in milliseconds.

### Example

The following example shows how to use the eval function to evaluate the response. The function checks if the combined latency is more 10ms then returns `DEGRADED`.

```javascript
(async function (arrayOfPings) {
    let latencyTotal = arrayOfPings.reduce((acc, ping) => {
        return acc + ping.latency
    }, 0)

    let areAllOpen = arrayOfPings.reduce((acc, ping) => {
        if (ping.status === "open") {
            return acc && true
        } else {
            return false
        }
    }, true)

    let avgLatency = latencyTotal / arrayOfPings.length

    if (areAllOpen && avgLatency > 10) {
        return {
            status: "DEGRADED",
            latency: avgLatency
        }
    }

    return {
        status: areAllOpen ? "UP" : "DOWN",
        latency: avgLatency
    }
})
```
