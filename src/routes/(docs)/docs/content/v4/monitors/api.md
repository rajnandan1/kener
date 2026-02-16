---
title: API Monitor
description: Monitor HTTP/HTTPS endpoints with custom methods, headers, and advanced evaluation logic
---

API monitors allow you to track the uptime, latency, and correctness of your HTTP/HTTPS endpoints. Kener provides flexible options to configure the request including custom headers, request bodies, authentication, and JavaScript-based evaluation logic to determine status.

## How API Monitoring Works {#how-api-monitoring-works}

Kener's API monitoring follows this workflow:

1. **Build Request**: Kener constructs an HTTP request with the configured method, headers, body, and timeout.
2. **Environment Variables**: Any `$VARIABLE_NAME` placeholders in URL, headers, or body are replaced with environment variable values.
3. **Execute Request**: The request is sent using Axios with configurable SSL settings.
4. **Measure Latency**: Total time from request start to response completion is recorded.
5. **Evaluate Response**: The custom eval function receives the status code, latency, and response body to determine monitor status.

## Configuration Options {#configuration-options}

| Field                       | Type       | Description                                                                                      | Default       |
| :-------------------------- | :--------- | :----------------------------------------------------------------------------------------------- | :------------ |
| **URL**                     | `string`   | The fully qualified URL to monitor (e.g., `https://api.example.com/health`).                     | (Required)    |
| **Method**                  | `string`   | HTTP method to use. Options: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`.         | `GET`         |
| **Timeout**                 | `number`   | Maximum time in milliseconds to wait for a response before considering it a failure.             | `10000` (10s) |
| **Headers**                 | `array`    | List of custom HTTP headers (Key-Value pairs). Useful for authentication or content negotiation. | `[]`          |
| **Body**                    | `string`   | The raw request body to send. Required for methods like `POST` or `PUT`. Usually a JSON string.  | `""`          |
| **Allow Self-Signed Certs** | `boolean`  | If enabled, the monitor will ignore SSL certificate errors (e.g., self-signed or expired certs). | `false`       |
| **Custom Eval**             | `function` | A JavaScript snippet to manually validate the response and determine the status.                 | Default logic |

## Custom Evaluation {#custom-evaluation}

By default, Kener considers a monitor **UP** if the HTTP status code is **2xx** (200-299). You can override this behavior using the **Custom Eval** field. This is powerful for checking specific JSON properties in the response or setting thresholds for latency.

The evaluation function runs in a sandboxed environment and receives the following arguments:

- `statusCode` (`number`): The HTTP status code returned by the server.
- `responseTime` (`number`): Time taken for the request in milliseconds.
- `responseRaw` (`string`): The raw response body (text).
- `modules` (`object`): Available helper modules. Currently supports [`cheerio`](https://cheerio.js.org/) for HTML parsing.

**Return Value:**
The function can be **synchronous** or **asynchronous** (using `async` or returning a `Promise`). It **must** return (or resolve to) an object with:

- `status`: `'UP'`, `'DEGRADED'`, `'DOWN'` or `'MAINTENANCE'`.
- `latency`: The latency to record (typically just returns `responseTime`).

### Default Implementation {#default-implementation}

Here is the default logic used if you don't provide a custom function:

```javascript
;(statusCode, responseTime, responseRaw, modules) => {
    let status = "DOWN"
    // Success Range
    if (statusCode >= 200 && statusCode < 299) {
        status = "UP"
    }
    // Rate Limited (429) is often considered degraded
    if (statusCode == 429) {
        status = "DEGRADED"
    }
    return {
        status: status,
        latency: responseTime
    }
}
```

## Examples {#examples}

### 1. Basic GET Request {#basic-get-request}

A simple health check for a public URL.

```json
{
    "tag": "api-website",
    "name": "Homepage",
    "type": "API",
    "url": "https://kener.ing",
    "method": "GET",
    "timeout": 5000
}
```

### 2. Authenticated POST with JSON {#authenticated-post-with-json}

Sending a login request with a Bearer token and JSON body.

```json
{
    "tag": "api-auth-check",
    "name": "Auth Service",
    "type": "API",
    "url": "https://api.example.com/v1/login",
    "method": "POST",
    "headers": [
        { "key": "Content-Type", "value": "application/json" },
        { "key": "Authorization", "value": "Bearer YOUR_SECRET_TOKEN" }
    ],
    "body": "{\"username\": \"monitor_user\", \"password\": \"secure_password\"}",
    "timeout": 10000
}
```

### 3. Advanced Validation (Business Logic) {#advanced-validation-business-logic}

In this example, we mark the monitor as **DOWN** if the JSON response is missing `success: true`, and **DEGRADED** if it takes longer than 500ms, even if the status code is 200.

**Configuration:**

- **URL**: `https://api.example.com/status`
- **Method**: `GET`
- **Custom Eval**:

```javascript
;(statusCode, responseTime, responseRaw, modules) => {
    let status = "UP"
    let body = {}

    try {
        body = JSON.parse(responseRaw)
    } catch (e) {
        return { status: "DOWN", latency: responseTime }
    }

    // Business Logic: 'success' must be true
    if (statusCode !== 200 || body.success !== true) {
        status = "DOWN"
    }
    // Performance Logic: Latency > 500ms is degraded
    else if (responseTime > 500) {
        status = "DEGRADED"
    }

    return {
        status: status,
        latency: responseTime
    }
}
```

### 4. HTML Parsing with Cheerio {#html-parsing-with-cheerio}

You can use the built-in `cheerio` module to parse HTML responses and check for specific elements or text.

```javascript
;async (statusCode, responseTime, responseRaw, modules) => {
    let html = responseRaw
    const $ = modules.cheerio.load(html)
    // Find all component containers
    const components = $(".components-section .components-container .component-container")

    let status = true

    // Iterate through components to check their status
    components.each((index, element) => {
        // const name = $(element).find(".component-name").text().trim();
        const statusText = $(element).find(".component-status").text().trim()

        // Fail if any component is not 'Operational'
        if (statusText !== "Operational") {
            status = false
        }
    })

    return {
        status: status ? "UP" : "DOWN",
        latency: responseTime
    }
}
```

> [!NOTE]
> The above example uses an `async` function wrapper. While this particular example doesn't require async operations, the function can be async if you need to perform asynchronous operations within your evaluation logic.

## Using Environment Variables {#using-environment-variables}

Kener supports environment variable substitution in URLs, headers, and body content:

```
https://api.example.com/v1/status?apikey=$API_KEY
```

Environment variables are replaced at runtime:

- `$API_KEY` → value of `process.env.API_KEY`

This keeps sensitive credentials out of your configuration.

## Best Practices {#best-practices}

### URL Configuration {#best-practices-url}

1. **Use dedicated health endpoints**: `/health`, `/status`, or `/ping` endpoints are lightweight.
2. **Avoid authentication on health checks**: If possible, use endpoints that don't require auth.
3. **Use HTTPS**: Always prefer secure connections for production monitoring.

### Timeout Configuration {#best-practices-timeout}

| Scenario               | Recommended Timeout | Rationale                  |
| :--------------------- | :------------------ | :------------------------- |
| Health check endpoints | 5000ms              | Should be fast             |
| API endpoints          | 10000ms             | Standard API response time |
| Heavy processing       | 30000ms             | Reports, analytics, etc.   |
| External third-party   | 15000ms             | Network variability        |

### Evaluation Logic {#best-practices-evaluation}

1. **Always return both status and latency**: The evaluation must return both fields.
2. **Handle JSON parse errors**: Wrap `JSON.parse()` in try-catch.
3. **Check for empty responses**: Empty body might indicate a problem.
4. **Use DEGRADED appropriately**: For slow but functional services.

## Troubleshooting {#troubleshooting}

### Common Issues {#common-issues}

| Issue                   | Possible Cause                         | Solution                         |
| :---------------------- | :------------------------------------- | :------------------------------- |
| Always DOWN             | URL unreachable or wrong               | Verify URL is accessible         |
| SSL errors              | Self-signed or expired certificate     | Enable "Allow Self-Signed Certs" |
| Timeout errors          | Server too slow or network issues      | Increase timeout value           |
| Authentication failures | Wrong credentials or token expired     | Check environment variables      |
| Eval errors             | JavaScript syntax error in custom eval | Test eval function separately    |

### Debug Tips {#debug-tips}

1. **Test with curl**:

    ```bash
    curl -v -X GET "https://api.example.com/health" \
         -H "Authorization: Bearer $TOKEN"
    ```

2. **Check response format**: Ensure you're parsing the response correctly (JSON vs HTML).

3. **Verify environment variables**: Ensure all `$VARIABLE` references are set.

4. **Test eval function**: Test your custom eval with sample data before deploying.
