---
title: API Monitors | Kener
description: Learn how to set up and work with API monitors in kener.
---

# API Monitors

API monitors are used to monitor APIs. You can use API monitors to monitor the uptime of your Website or APIs and get notified when they are down.

<div class="border rounded-md">

![Monitors API](/m_api.png)

</div>

## Timeout

<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

The timeout is used to define the time in milliseconds after which the monitor should timeout. If the monitor does not respond within the timeout period, the monitor will be marked as down. For example, `5000` will set the timeout to 5 seconds. It is required and has to be a number greater than 0.

## URL

<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

The URL is used to define the URL of the API that you want to monitor. It is required and has to be a valid URL.

## Method

<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

The method is used to define the HTTP method that should be used to make the request. It is required and has to be one of the following: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.

## Headers

The headers are used to define the headers that should be sent with the request. It is optional and has to be a valid JSON object.

## Eval

The eval is used to define the JavaScript code that should be used to evaluate the response. It is optional and has be a valid JavaScript code.

This is a anonymous JS function, by default it looks like this.

> **_NOTE:_** The eval function should always return a json object. The json object can have only status(UP/DOWN/DEGRADED) and latency(number)
> `{status:"DEGRADED", latency: 200}`.

```javascript
(function (statusCode, responseTime, responseDataBase64) {
	let statusCodeShort = Math.floor(statusCode/100);
	let status = 'DOWN'
    if(statusCodeShort >=2 && statusCodeShort <= 3) {
        status = 'UP',
    }
	return {
		status: 'DOWN',
		latency: responseTime,
	}
})
```

-   `statusCode` **REQUIRED** is a number. It is the HTTP status code
-   `responseTime` **REQUIRED**is a number. It is the latency in milliseconds
-   `responseDataBase64` **REQUIRED** is a string. It is the base64 encoded response data. To use it you will have to decode it

```js
let decodedResp = atob(responseDataBase64);
//if the response is a json object
//let jsonResp = JSON.parse(decodedResp)
```

<div class="note danger">
    The eval is validated against (200, 1000, "e30=") which translates to (200, 1000, '{}') within the function. So whatever function you write should be able to handle these values otherwise you won't be able to save the monitor.
</div>

#### Example

The following example shows how to use the eval function to evaluate the response. The function checks if the status code is 2XX then the status is UP, if the status code is 5XX then the status is DOWN. If the response contains the word `Unknown Error` then the status is DOWN. If the response time is greater than 2000 then the status is DEGRADED.

```javascript
(function (statusCode, responseTime, responseDataBase64) {
	const resp = atob(responseDataBase64); //convert base64 to string

	let status = "DOWN";

	//if the status code is 2XX then the status is UP
	if (/^[2]\d{2}$/.test(statusCode)) {
		status = "UP";
		if (responseTime > 2000) {
			status = "DEGRADED";
		}
	}

	//if the status code is 5XX then the status is DOWN
	if (/^[5]\d{2}$/.test(statusCode)) status = "DOWN";

	if (resp.includes("Unknown Error")) {
		status = "DOWN";
	}

	return {
		status: status,
		latency: responseTime
	};
});
```

## Examples

### Website Monitor

This is an example to monitor google every 5 minute.

<label for="websiteMonitor" class="accm">

<input type="checkbox" class="absolute opacity-0" id="websiteMonitor" />

<p class="font-medium p-1 accmt rounded-md showaccm">
	<span>↓ Show Example</span>
	<span>↑ Hide Example</span>
</p>

<div class="border rounded-md">

![Monitors API](/m_ex_website.png)

</div>

</label>

### Get Request

Example to monitor a GET Request with an Authorization header set to `$SOME_TOKEN`.

`$SOME_TOKEN` is set in environment variables as `SOME_TOKEN`

```bash
export SOME_TOKEN=some-token-example
```

<label for="exp2" class="accm">

<input type="checkbox" class="absolute opacity-0" id="exp2" />

<p class=" font-medium p-1 accmt rounded-md showaccm">
	<span>↓ Show Example</span>
	<span>↑ Hide Example</span>
</p>

<div class="border rounded-md p-1">

![Monitors API](/m_ex_2.png)

</div>

</label>

### POST Request

Example showing setting up a POST request every minute with a timeout of 2 seconds.

<label for="exp3" class="accm">

<input type="checkbox" class="absolute opacity-0" id="exp3" />

<p class=" font-medium p-1 accmt rounded-md showaccm">
	<span>↓ Show Example</span>
	<span>↑ Hide Example</span>
</p>

<div class="border rounded-md p-1">

![Monitors API](/m_ex_3.png)

</div>

</label>

### Custom Response Eval

Example showing how to use a custom response eval function. It also shows how to set secrets in body for POST Request.
The secrets have to be present in environment variables.

```bash
export SERVICE_TOKEN=secret1_tone
export SERVICE_SECRET=secret2_secret
```

<label for="exp4" class="accm">

<input type="checkbox" class="absolute opacity-0" id="exp4" />

<p class=" font-medium p-1 accmt rounded-md showaccm">
	<span>↓ Show Example</span>
	<span>↑ Hide Example</span>
</p>

<div class="border rounded-md p-1">

![Monitors API](/m_ex_4.png)

</div>

</label>
