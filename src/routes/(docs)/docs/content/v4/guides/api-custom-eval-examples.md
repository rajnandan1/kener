---
title: API Custom Eval Examples
description: Ready-to-use API monitor eval functions for UP, DEGRADED, and DOWN states
---

Use these snippets directly in an API monitor.

## JSONPlaceholder todos threshold eval {#todos-threshold-eval}

API: `https://jsonplaceholder.typicode.com/todos`
Response: Array of todo objects with `completed` boolean field.

```json
[
  {
    "userId": 1,
    "id": 1,
    "title": "delectus aut autem",
    "completed": false
  },
	{
		"userId": 1,
		"id": 2,
		"title": "quis ut nam facilis et officia qui",
		"completed": true
	},
	...
]
```

### Eval function:

```javascript
(async function (statusCode, responseTime, responseRaw) {
    if (statusCode !== 200) {
        return { status: "DOWN", latency: responseTime }
    }

    let todos
    try {
        todos = JSON.parse(responseRaw)
    } catch {
        return { status: "DOWN", latency: responseTime }
    }

    if (!Array.isArray(todos)) {
        return { status: "DOWN", latency: responseTime }
    }

    const completedCount = todos.filter((t) => t && t.completed === true).length

    if (completedCount <= 10) {
        return { status: "UP", latency: responseTime }
    }

    if (completedCount <= 20) {
        return { status: "DEGRADED", latency: responseTime }
    }

    return { status: "DOWN", latency: responseTime }
})
```

## POST request body with $SECRET_PARAM (no eval) {#post-secret-param-body}

```json
{
    "method": "POST",
    "headers": [{ "key": "Content-Type", "value": "application/json" }],
    "body": "{\"token\":\"$SECRET_PARAM\",\"action\":\"ping\"}"
}
```

```env
SECRET_PARAM=your_real_secret_value
```

> [!IMPORTANT]
> `$SECRET_PARAM` is resolved from environment variables at runtime. If `SECRET_PARAM` is not set in `.env` (or process env), your request body will not be populated with the secret value.

## Cheerio HTML content check {#cheerio-html-check-eval}

```javascript
(async function (statusCode, responseTime, responseRaw, modules) {
    if (statusCode !== 200) {
        return { status: "DOWN", latency: responseTime }
    }

    let html = responseRaw
    const $ = modules.cheerio.load(html)
    const header = $('[class^="ContentBox_header"]')

    let status = true
    if (!header.text().includes("We’re fully operational")) {
        status = false
    }

    return {
        status: status ? "UP" : "DOWN",
        latency: responseTime
    }
})
```
