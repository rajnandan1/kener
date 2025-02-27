---
title: Ping Monitors | Kener
description: Learn how to set up and work with Ping monitors in kener.
---

# Ping Monitors

Ping monitors are used to monitor livenees of your servers. You can use Ping monitors to monitor the uptime of your servers and get notified when they are down.

<div class="border rounded-md">

![Monitors Ping](/documentation/m_ping.png)

</div>

## Hosts

You can add as many hosts as you want to monitor. The host can be an IP(IP4 and IP6) address or a domain name.

-   Type: Choose the type of host you want to monitor. It can be either `IP4` or `IP6` or `DOMAIN`.
-   Host: Enter the IP address or domain name of the host you want to monitor.
-   Timeout: Enter the timeout in milliseconds for each ping request of each host. For IP6 timeout is not supported.
-   Count: The number of pings you want to do for each host. The average latency of all the pings will be used to evaluate the response.

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
        return acc && ping.alive
    }, true)

    return {
        status: alive ? "UP" : "DOWN",
        latency: latencyTotal / arrayOfPings.length
    }
})
```

-   `arrayOfPings` **REQUIRED** is an array of Ping Response Objects as shown below.

```json
/*
[
  {
    alive: true,
    min: '145.121',
    max: '149.740',
    avg: '147.430',
    latencies: [ 145.121, 149.74 ],
    latency: 145.121,
    host: '45.91.169.49',
    type: 'IP4'
  },
  {
    alive: true,
    min: '145.348',
    max: '149.143',
    avg: '147.245',
    latencies: [ 145.348, 149.143 ],
    latency: 145.348,
    host: 'kener.ing',
    type: 'DOMAIN'
  },
  {
    alive: true,
    min: '57.696',
    max: '58.330',
    avg: '58.013',
    latencies: [ 57.696, 58.33 ],
    latency: 57.696,
    host: '2404:6800:4003:c1c::66',
    type: 'IP6'
  }
]
*/
```

### Understanding the Input

Each object in the array represents the ping response of a host.

-   `alive` is a boolean. It is true if the host is alive and false if the host is down.
-   `min` is a string. It is the minimum latency of the pings.
-   `max` is a string. It is the maximum latency of the pings.
-   `avg` is a string. It is the average latency of the pings.
-   `latencies` is an array of numbers. It is the latency of each ping.
-   `latency` is a number. It is the average latency of the pings.
-   `host` is a string. It is the host that was pinged.
-   `type` is a string. It is the type of the host. It can be either `IP4` or `IP6` or `DOMAIN`.

### Example

The following example shows how to use the eval function to evaluate the response. The function checks if the combined latency is more 10ms then returns `DEGRADED`.

```javascript
(async function (arrayOfPings) {
    let latencyTotal = arrayOfPings.reduce((acc, ping) => {
        return acc + ping.latency
    }, 0)

    let areAllOpen = arrayOfPings.reduce((acc, ping) => {
        return acc && ping.alive
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
