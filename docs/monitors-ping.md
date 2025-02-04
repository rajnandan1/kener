---
title: Ping Monitors | Kener
description: Learn how to set up and work with Ping monitors in kener.
---

# Ping Monitors

Ping monitors are used to monitor livenees of your servers. You can use Ping monitors to monitor the uptime of your servers and get notified when they are down.

<div class="border rounded-md">

![Monitors Ping](/m_ping.png)

</div>

## Host V4

You can add as many IP addresses as you want to monitor. The IP address should be a valid IPv4 address. Example of IP4 address is `106.12.43.232`.

## Host V6

You can add as many IP addresses as you want to monitor. The IP address should be a valid IPv6 address. Example of IP6 address is `2001:0db8:85a3:0000:0000:8a2e:0370:7334`.

<p class="note danger">
	Please note that atleast one of the Host V4 or Host V6 is required.
<p>

## Eval

The eval is used to define the JavaScript code that should be used to evaluate the response. It is optional and has be a valid JavaScript code.

This is an anonymous JS function, it should return a **Promise**, that resolves or rejects to `{status, latency}`, by default it looks like this.

> **_NOTE:_** The eval function should always return a json object. The json object can have only status(UP/DOWN/DEGRADED) and latency(number)
> `{status:"DEGRADED", latency: 200}`.

```javascript
(async function (responseDataBase64) {
	let arrayOfPings = JSON.parse(atob(responseDataBase64));
	let latencyTotal = arrayOfPings.reduce((acc, ping) => {
		return acc + ping.latency;
	}, 0);

	let alive = arrayOfPings.reduce((acc, ping) => {
		if (ping.status === "open") {
			return acc && true;
		} else {
			return false;
		}
	}, true);

	return {
		status: alive ? "UP" : "DOWN",
		latency: parseInt(latencyTotal / arrayOfPings.length)
	};
});
```

-   `responseDataBase64` **REQUIRED** is a string. It is the base64 encoded response data. To use it you will have to decode it and the JSON parse it. Once parse it will be an array of objects.

```js
let decodedResp = atob(responseDataBase64);
let jsonResp = JSON.parse(decodedResp);
console.log(jsonResp);
/*
[
	{
		"host": "smtp.resend.com",
		"port": 587,
		"type": "IP4",
		"status": "open",
		"latency": 36.750917
	},
	{
		"host": "66.51.120.219",
		"port": 465,
		"type": "IP4",
		"status": "open",
		"latency": 27.782792
	},
	{
		"host": "2606:4700:4700::1111",
		"port": 443,
		"status": "open",
		"type": "IP6",
		"latency": 5.684375
	}
]
*/
```

### Understanding the Input

-   `host`: The host that was pinged.
-   `port`: The port that was pinged. Defaults to 80 if not provided.
-   `type`: The type of IP address. Can be `IP4` or `IP6`.
-   `status`: The status of the ping. Can be `open` , `error` or `timeout`.
    -   `open`: The host is reachable.
    -   `error`: There was an error while pinging the host.
    -   `timeout`: The host did not respond in time.
-   `latency`: The time taken to ping the host. This is in milliseconds.

### Example

The following example shows how to use the eval function to evaluate the response. The function checks if the combined latency is more 10ms then returns `DEGRADED`.

```javascript
(async function (responseDataBase64) {
	let arrayOfPings = JSON.parse(atob(responseDataBase64));
	let latencyTotal = arrayOfPings.reduce((acc, ping) => {
		return acc + ping.latency;
	}, 0);

	let areAllOpen = arrayOfPings.reduce((acc, ping) => {
		if (ping.status === "open") {
			return acc && true;
		} else {
			return false;
		}
	}, true);

	let avgLatency = latencyTotal / arrayOfPings.length;

	if (areAllOpen && avgLatency > 10) {
		return {
			status: "DEGRADED",
			latency: avgLatency
		};
	}

	return {
		status: areAllOpen ? "UP" : "DOWN",
		latency: avgLatency
	};
});
```
