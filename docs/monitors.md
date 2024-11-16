---
title: Monitors | monitors.yaml | Kener
description: Monitors are the heart of Kener. This is where you define the monitors you want to show on your site.
---

# Monitors

Inside `config/` folder there is a file called `monitors.yaml`. We will be adding our monitors here. Please note that your yaml must be valid. It is an array.

## Understanding monitors

Each monitor runs at 1 minute interval by default. Monitor runs in below priorty order.

-   defaultStatus Data
-   API call Data overrides above data(if specified)
-   Pushed Status Data overrides API Data using [Kener Update Statue API](https://rajnandan1.github.io/kener-docs/docs/kener-apis#update-status)
-   Manual Incident Data overrides Pushed Status Data

Sample

```yaml
- name: Google Search
  description: Search the world's information, including webpages, images, videos and more.
  tag: "google-search"
  image: "/google.png"
  cron: "* * * * *"
  defaultStatus: "UP"
  api:
	timeout: 4000
	method: POST
	url: https://www.google.com/webhp
	headers:
		Content-Type: application/json
	body: '{"order_amount":1,"order_currency":"INR"}'
	eval: |
		(function(statusCode, responseTime, responseDataBase64){
		const resp = JSON.parse(atob(responseDataBase64));
		return {
			status: statusCode == 200 ? 'UP':'DOWN',
			latency: responseTime,
		}
		})
```

| name                      | Required          | This will be shown in the UI to your users. Keep it short and unique                                                                                                                                                |
| ------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| name                      | Required + Unique | This will be shown in the UI to your users. Keep it short and unique                                                                                                                                                |
| description               | Optional          | This will be show below your name                                                                                                                                                                                   |
| tag                       | Required + Unique | This is used to tag incidents created in Github using comments                                                                                                                                                      |
| image                     | Optional          | To show a logo before the name                                                                                                                                                                                      |
| cron                      | Optional          | Use cron expression to specify the interval to run the monitors. Defaults to `* * * * *` i.e every minute                                                                                                           |
| api.timeout               | Optional          | timeout for the api in milliseconds. Default is 10000(10 secs)                                                                                                                                                      |
| api.method                | Optional          | HTTP Method                                                                                                                                                                                                         |
| api.url                   | Optional          | HTTP URL                                                                                                                                                                                                            |
| api.headers               | Optional          | HTTP headers                                                                                                                                                                                                        |
| api.body                  | Optional          | HTTP Body as string                                                                                                                                                                                                 |
| api.hideURLForGet         | Optional          | if the monitor is a GET URL and no headers are specified and the response body content-type is a text/html then kener shows a GET hyperlink in monitor description. To hide that set this as false. Default is true |
| api.eval                  | Optional          | Evaluator written in JS, to parse HTTP response and calculate uptime and latency                                                                                                                                    |
| defaultStatus             | Optional          | If no API is given this will be the default status. can be UP/DOWN/DEGRADED                                                                                                                                         |
| hidden                    | Optional          | If set to `true` will not show the monitor in the UI                                                                                                                                                                |
| category                  | Optional          | Use this to group your monitors. Make sure you have defined category in `site.yaml` and use the `name` attribute. More about it [here](/docs/customize-site#categories).                                            |
| dayDegradedMinimumCount   | Optional          | Default is 1. It means minimum this number of count for the day to be classified as DEGRADED(Yellow Bar) in 90 day view. Has to be `number` greater than 0                                                          |
| dayDownMinimumCount       | Optional          | Default is 1. It means minimum this number of count for the day to be classified as DOWN(Red Bar) in 90 day view. Has to be `number` greater than 0                                                                 |
| includeDegradedInDowntime | Optional          | By deafault uptime percentage is calculated as (UP+DEGRADED/UP+DEGRADED+DOWN). Setting it as `true` will change the calculation to (UP/UP+DEGRADED+DOWN)                                                            |
| ping.hostsV4              | Optional          | Array of hosts / IP to monitor ping response. Either domain name or IP4                                                                                                                                             |
| ping.hostsV6              | Optional          | Array of hosts / IP to monitor ping response. Either domain name or IP6                                                                                                                                             |

## eval

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
