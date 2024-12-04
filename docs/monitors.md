---
title: Monitors | monitors.yaml | Kener
description: Monitors are the heart of Kener. This is where you define the monitors you want to show on your site.
---

# Monitors

Inside `config/` folder there is a file called `monitors.yaml`. We will be adding our monitors here. Please note that your yaml must be valid. It is an array.

## Understanding monitors

Each monitor runs at 1 minute interval by default. Monitor runs in below priority order.

-   `defaultStatus` Data. Used to set the default status of the monitor
-   PING/API/DNS call Data overrides above data(if present)
-   Pushed Status Data overrides status Data using [Kener Update Statue API](/docs/kener-apis#update-status---api)
-   [Manual Incident](/docs/incident-management) Data overrides Pushed Status Data

## General Attributes

A list of attributes that can be used in all types of monitors.

| Key                       | Required?         | Explanation                                                                                                                                                              |
| ------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| name                      | Required + Unique | This will be shown in the UI to your users. Keep it short and unique                                                                                                     |
| description               | Optional          | This is a breif description for the monitor                                                                                                                              |
| tag                       | Required + Unique | This is used to tag incidents created in Github using comments                                                                                                           |
| image                     | Optional          | To show a logo before the name                                                                                                                                           |
| cron                      | Optional          | Use a valid cron expression to specify the interval to run the monitors. Defaults to `* * * * *` i.e every minute                                                        |
| defaultStatus             | Optional          | This will be the default status if no other way is specified to check the monitor. can be `UP`/`DOWN`/`DEGRADED`                                                         |
| hidden                    | Optional          | If set to `true` will not show the monitor in the UI                                                                                                                     |
| category                  | Optional          | Use this to group your monitors. Make sure you have defined category in `site.yaml` and use the `name` attribute. More about it [here](/docs/customize-site#categories). |
| dayDegradedMinimumCount   | Optional          | Default is 1. It means, minimum this number of count for the day to be classified as DEGRADED(Yellow Bar) in 90 day view. Has to be `number` greater than 0              |
| dayDownMinimumCount       | Optional          | Default is 1. It means, minimum this number of count for the day to be classified as DOWN(Red Bar) in 90 day view. Has to be `number` greater than 0                     |
| includeDegradedInDowntime | Optional          | By deafault uptime percentage is calculated as (UP+DEGRADED/UP+DEGRADED+DOWN). Setting it as `true` will change the calculation to (UP/UP+DEGRADED+DOWN)                 |

### Example

```yaml
- name: "Google"
  description: "Google Search Engine"
  tag: "google"
  image: "https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png"
  defaultStatus: "UP"
  hidden: false
  dayDegradedMinimumCount: 2
  dayDownMinimumCount: 3
  includeDegradedInDowntime: false
```

`dayDegradedMinimumCount` and `dayDownMinimumCount` only works when `summaryStyle` is set as `DAY` in `site.yaml`. More about it [here](/docs/customize-site#summarystyle)

## API Monitor Attributes

A list of attributes that can be used in API monitors.

| Key               | Required? | Explanation                                                                                                                                                                                                           |
| ----------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| api.url           | Required  | HTTP URL                                                                                                                                                                                                              |
| api.method        | Optional  | HTTP Method. Default is `GET`                                                                                                                                                                                         |
| api.headers       | Optional  | HTTP headers                                                                                                                                                                                                          |
| api.body          | Optional  | HTTP Body as string                                                                                                                                                                                                   |
| api.timeout       | Optional  | timeout for the api in milliseconds. Default is 10000(10 secs)                                                                                                                                                        |
| api.eval          | Optional  | Evaluator written in JS, to parse HTTP response and calculate uptime and latency                                                                                                                                      |
| api.hideURLForGet | Optional  | if the monitor is a GET URL and no headers are specified and the response body content-type is a text/html then kener shows a GET hyperlink in monitor description. To hide that set this as false. Default is `true` |

### Eval

This is a anonymous JS function, by default it looks like this.

> **_NOTE:_** The eval function should always return a json object. The json object can have only status(UP/DOWN/DEGRADED) and lantecy(number)
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
//let jsonResp = JSON.parse(decodedResp)
```

### Example

```yaml
- name: "Google"
  description: "Google Search Engine"
  tag: "google"
  image: "https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png"
  defaultStatus: "UP"
  hidden: false
  api:
	url: "https://www.google.com"
	method: "GET"
	headers:
	  "Content-Type": "application/json"
	body: ""
	timeout: 10000
	eval: |
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

To view more examples of API monitors, please visit [here](/docs/monitors-examples)

## PING Monitor Attributes

A list of attributes that can be used in PING monitors.

| Key          | Required? | Explanation                                                             |
| ------------ | --------- | ----------------------------------------------------------------------- |
| ping.hostsV4 | Required  | Array of hosts / IP to monitor ping response. Either domain name or IP4 |
| ping.hostsV6 | Required  | Array of hosts / IP to monitor ping response. Either domain name or IP6 |

Either one of `hostsV4` or `hostsV6` is required

### Example

```yaml
- name: "Ping All"
  description: "Ping All is where I ping all the hosts"
  tag: "pingall"
  defaultStatus: "UP"
  ping:
	hostsV4:
		- "www.rajnandan.com"
	  	- "103.125.217.243"
```

You can find more examples of PING monitors [here](/docs/monitor-examples#ping-monitor)

## DNS Monitor Attributes

A list of attributes that can be used in DNS monitors.

| Key              | Required? | Explanation                                                              |
| ---------------- | --------- | ------------------------------------------------------------------------ |
| dns.hosts        | Required  | Array of hosts to monitor DNS response. Either domain name or IP4 or IP6 |
| dns.lookupRecord | Required  | DNS record type.                                                         |
| dns.nameServer   | Required  | DNS server to use.                                                       |
| dns.matchType    | Required  | Match type for DNS response. Can be `ANY` or `ALL`. Default is `ALL`     |
| dns.values       | Required  | Expected values for the DNS response. Array of string                    |

### Example

```yaml
- name: "DNS All"
  description: "DNS All is where I check all the DNS"
  tag: "dnsall"
  defaultStatus: "UP"
  dns:
      host: "www.rajnandan.com"
      lookupRecord: "CNAME"
      nameServer: "8.8.8.8"
      matchType: "ANY"
      values:
          - "rajnandan1.github.io"
```
