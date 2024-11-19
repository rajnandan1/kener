---
title: Kener APIs
description: Kener gives APIs to push data and create incident.
---

# Kener APIs

Kener also gives APIs to push data and create incident. Before you use kener apis you will have to set an authorization token called `API_TOKEN`. This also has to be set as an environment variable.

```shell
export API_TOKEN=some-token-set-by-you
```

Additonally you can set IP whitelisting by setting another environment token called `API_IP` or `API_IP_REGEX`. If you set both `API_IP` and `API_IP_REGEX`, `API_IP` will be given preference. Read more [here](/docs/environment-vars#api_ip)

## Interactive API Reference

<p class="border p-4 rounded-md">
	<picture class="inline">
	<source srcset="https://fonts.gstatic.com/s/e/notoemoji/latest/1f916/512.webp" type="image/webp">
	<img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f916/512.gif" alt="🤖" width="32" height="32">
	</picture> 
	<a href="/api-reference">
		Click here to view the interactive API reference
	</a>

</p>

You can download the openapi spec

-   [JSON](https://raw.githubusercontent.com/rajnandan1/kener/main/openapi.json)
-   [YAML](https://raw.githubusercontent.com/rajnandan1/kener/main/openapi.yaml)

---

## Update Status - API

![Static Badge](https://img.shields.io/badge/METHOD-POST-blue?style=flat-square)

The update status API can be used to manually update the state of a monitor from a remote server.

### Request Body

| Parameter          | Description                                                                          |
| ------------------ | ------------------------------------------------------------------------------------ |
| status             | `Required` Can be only UP/DOWN/DEGRADED                                              |
| latency            | `Required` In Seconds. Leave 0 if not required                                       |
| timestampInSeconds | `Optional` Timestamp in UTC seconds. Defaults to now. Should between 90 Days and now |
| tag                | `Required` Monitor Tag set in monitors.yaml                                          |

```shell
curl --request POST \
  --url http://your-kener.host/api/status \
  --header 'Authorization: Bearer some-token-set-by-you' \
  --header 'Content-Type: application/json' \
  --data '{
	"status": "DOWN",
	"latency": 1213,
	"timestampInSeconds": 1702405860,
	"tag": "google-search"
}'
```

### Response

```json
{
	"status": 200,
	"message": "success at 1702405860"
}
```

This will update the status of the monitor with tag `google-search` to DOWN at UTC 1702405860

---

## Get Status - API

![Static Badge](https://img.shields.io/badge/METHOD-GET-green?style=flat-square)

Use this API to get the status of a monitor.

### Request

Replace `google-search` with your monitor tag in query param

```shell
curl --request GET \
  --url 'http://your-kener.host/api/status?tag=google-search' \
  --header 'Authorization: Bearer some-token-set-by-you'
```

### Response

```json
{
	"status": "UP",
	"uptime": "9.0026",
	"lastUpdatedAt": 1706447160
}
```

---

## Create an Incident - API

![Static Badge](https://img.shields.io/badge/METHOD-POST-blue?style=flat-square)

Can be use to create an incident from a remote server

### Request Body

| Parameter     | Description                                              |
| ------------- | -------------------------------------------------------- |
| startDatetime | `Optional` When did the incident start in UTC second     |
| endDatetime   | `Optional` When did the incident end in UTC seconds      |
| title         | `Required` Title of the incident                         |
| body          | `Optional` Body of the incident                          |
| tags          | `Required` Array of String, Monitor Tags of the incident |
| impact        | `Optional` Can be only DOWN/DEGRADED                     |
| isMaintenance | `Optional` Boolean if incident is a maintenance          |
| isIdentified  | `Optional` Incident identified                           |
| isResolved    | `Optional` Incident resolved                             |

```shell
curl --request POST \
  --url http://your-kener.host/api/incident \
  --header 'Authorization: Bearer some-token-set-by-you' \
  --header 'Content-Type: application/json' \
  --data '{
	"startDatetime": 1702405740,
	"endDatetime": 1702405920,
	"title": "Outage in Mumbai",
	"body": "Login cluster is down in mumbai region",
	"tags": ["google-search"],
	"impact": "DOWN",
	"isMaintenance": false,
	"isIdentified": true,
	"isResolved": false
}'
```

### Response

```json
{
	"createdAt": 1703940450,
	"closedAt": null,
	"title": "Outage in Mumbai",
	"tags": ["google-search"],
	"incidentNumber": 12,
	"startDatetime": 1702405740,
	"endDatetime": 1702405920,
	"body": "Login cluster is down in mumbai region",
	"impact": "DOWN",
	"isMaintenance": false,
	"isIdentified": true,
	"isResolved": false
}
```

---

## Update an Incident - API

![Static Badge](https://img.shields.io/badge/METHOD-PATCH-yellow?style=flat-square)

Can be use to update an incident from a remote server. It will clear values if not passed

### Request Param

-   `incidentNumber`: Number of the incident

### Request Body

| Parameter     | Description                                              |
| ------------- | -------------------------------------------------------- |
| startDatetime | `Optional` When did the incident start in UTC second     |
| endDatetime   | `Optional` When did the incident end in UTC seconds      |
| title         | `Required` Title of the incident                         |
| body          | `Optional` Body of the incident                          |
| tags          | `Required` Array of String, Monitor Tags of the incident |
| impact        | `Optional` Can be only DOWN/DEGRADED                     |
| isMaintenance | `Optional` Boolean if incident is a maintenance          |
| isIdentified  | `Optional` Incident identified                           |
| isResolved    | `Optional` Incident resolved                             |

```shell
curl --request PATCH \
  --url http://your-kener.host/api/incident/{incidentNumber} \
  --header 'Authorization: Bearer some-token-set-by-you' \
  --header 'Content-Type: application/json' \
  --data '{
	"startDatetime": 1702405740,
	"endDatetime": 1702405920,
	"title": "Outage in Mumbai",
	"body": "Login cluster is down in mumbai region",
	"tags": ["google-search"],
	"impact": "DOWN",
	"isMaintenance": false,
	"isIdentified": true,
	"isResolved": false
}'
```

### Response

```json
{
	"createdAt": 1703940450,
	"closedAt": null,
	"title": "Outage in Mumbai",
	"tags": ["google-search"],
	"incidentNumber": 12,
	"startDatetime": 1702405740,
	"endDatetime": 1702405920,
	"body": "Login cluster is down in mumbai region",
	"impact": "DOWN",
	"isMaintenance": false,
	"isIdentified": true,
	"isResolved": false
}
```

---

## Get an Incident - API

![Static Badge](https://img.shields.io/badge/METHOD-GET-green?style=flat-square)

Use `incidentNumber` to fetch an incident

### Request Body

```shell
curl --request GET \
  --url http://your-kener.host/api/incident/{incidentNumber} \
  --header 'Authorization: Bearer some-token-set-by-you' \
```

### Response

```json
{
	"createdAt": 1703940450,
	"closedAt": null,
	"title": "Outage in Mumbai",
	"tags": ["google-search"],
	"incidentNumber": 12,
	"startDatetime": 1702405740,
	"endDatetime": 1702405920,
	"body": "Login cluster is down in mumbai region",
	"impact": "DOWN",
	"isMaintenance": false,
	"isIdentified": true,
	"isResolved": false
}
```

---

## Add Comment - API

![Static Badge](https://img.shields.io/badge/METHOD-POST-blue?style=flat-square)

Add comments for incident using `incidentNumber`

### Request

```shell
curl --request POST \
  --url http://your-kener.host/api/incident/{incidentNumber}/comment \
  --header 'Authorization: Bearer some-token-set-by-you' \
  --header 'Content-Type: application/json' \
  --data '{
	"body": "comment 1"
}'
```

### Response

```json
{
	"commentID": 1873376745,
	"body": "comment 1",
	"createdAt": 1704123938
}
```

---

## Get Comments - API

![Static Badge](https://img.shields.io/badge/METHOD-GET-green?style=flat-square)

Use this API to fetch all the comments for an incident

### Request

```shell
curl --request GET \
  --url http://your-kener.host/api/incident/{incidentNumber}/comment \
  --header 'Authorization: Bearer some-token-set-by-you' \
```

### Response

```json
[
	{
		"commentID": 1873372042,
		"body": "comment 1",
		"createdAt": 1704123116
	},
	{
		"commentID": 1873372169,
		"body": "comment 2",
		"createdAt": 1704123139
	}
]
```

---

## Update Incident Status - API

![Static Badge](https://img.shields.io/badge/METHOD-POST-blue?style=flat-square)

Use this to API to update the status of an ongoing incident.

### Request Body

| Parameter    | Description                                                  |
| ------------ | ------------------------------------------------------------ |
| isIdentified | `Optional` Boolean, set it when incident has been identified |
| isResolved   | `Optional` Boolean, set it when incident has been resolved   |
| endDatetime  | `Optional` When did the incident end in UTC seconds          |

### Request

```shell
curl --request POST \
  --url http://your-kener.host/api/incident/{incidentNumber}/status \
  --header 'Authorization: Bearer some-token-set-by-you' \
  --header 'Content-Type: application/json' \
  --data '{
	"isIdentified": true,
	"isResolved": false
	"endDatetime": 1702405920
}'
```

### Response

```json
{
	"createdAt": 1703940450,
	"closedAt": null,
	"title": "Outage in Mumbai",
	"tags": ["google-search"],
	"incidentNumber": 12,
	"startDatetime": 1702405740,
	"endDatetime": 1702405920,
	"body": "Login cluster is down in mumbai region",
	"impact": "DOWN",
	"isMaintenance": false,
	"isIdentified": true,
	"isResolved": false
}
```

---

## Search Incidents - API

![Static Badge](https://img.shields.io/badge/METHOD-POST-blue?style=flat-square)

Use this to API to search incidents.

### Request Body

| Parameter          | Description                                                                                    |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| state              | `Optional` open or closed. Default is open                                                     |
| tags               | `Optional` Comma separated monitor tags, example: earth,google-seach                           |
| page               | `Optional` Page number, starts with 1, defaults to 1                                           |
| per_page           | `Optional` Page size, defaults to 10, max is 100                                               |
| created_after_utc  | `Optional` timestamp in UTC seconds when the incident was created after. Example: 1702405920   |
| created_before_utc | `Optional` timestamp in UTC seconds when the incident was created before . Example: 1702405920 |
| title_like         | `Optional` search incidents with title                                                         |

### Request

Search incidents that are closed and title contains `hello incident`

```shell
curl --request POST \
  --url http://your-kener.host/api/incident?state=closed&title_like=Hello%20Incident \
  --header 'Authorization: Bearer some-token-set-by-you' \
  --header 'Content-Type: application/json' \
  --data '{
	"isIdentified": true,
	"isResolved": false
	"endDatetime": 1702405920
}'
```

### Response

```json
[
	{
		"createdAt": 1703940450,
		"closedAt": null,
		"title": "Outage in Mumbai - Hello Incident",
		"tags": ["google-search"],
		"incidentNumber": 12,
		"startDatetime": 1702405740,
		"endDatetime": 1702405920,
		"body": "Login cluster is down in mumbai region",
		"impact": "DOWN",
		"isMaintenance": false,
		"isIdentified": true,
		"isResolved": false
	}
]
```
