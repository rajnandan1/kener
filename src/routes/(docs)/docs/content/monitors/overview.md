---
title: Monitors Overview
description: Overview of monitor types and their functionalities in Kener
---

A monitor in Kener is a configured check that continuously verifies the availability and performance of your services. Monitors can be set up for various types of endpoints, including APIs, websites, servers, and more.

Each monitor is identified by a tag, which helps in organizing and filtering monitors in the dashboard.

## Monitor Statues {#status}

Kener categorizes monitor statuses into three main states:

- **<span class="text-green-600 dark:text-green-400">UP</span>**: The monitored service is operational and responding as expected.
- **<span class="text-red-600 dark:text-red-400">DOWN</span>**: The monitored service is not responding or is returning errors.
- **<span class="text-yellow-600 dark:text-yellow-400">DEGRADED</span>**: The monitored service is responding but with performance issues or partial failures.
- **<span class="text-blue-600 dark:text-blue-400">MAINTENANCE</span>**: The monitor is temporarily disabled for scheduled maintenance.
- **<span class="text-gray-600 dark:text-gray-400">NO DATA</span>**: The monitor has not received any data in the expected timeframe.

### Default Status {#default-status}

Default status is useful when you are not making an external call to check the status of a monitor. Instead, you can set a predefined status that the monitor will always return. This means that the monitor real status will be whatever you set as the default status. This is the lowest priority status and will be overridden by any actual checks if they are configured.

### Status Priority {#status-priority}

When multiple checks or conditions are used to determine the status of a monitor, Kener follows a priority order to decide the final status:

```
MAINTENANCE > INCIDENT > REALTIME > DEFAULT
```

This means that if a monitor is in maintenance mode, it will set the status to whatever is configured for the monitor in that maintenance window, regardless of other checks. If there is an active incident, that status will take precedence over realtime checks and default status. Realtime checks will override the default status if no incidents or maintenance are present.

## Scheduling {#scheduling}

Monitors can be scheduled to run at specific intervals, ranging from every minute to once a day. The frequency of checks can be configured based on the criticality of the service being monitored. The way you can do it is through `cron` expressions which provide flexibility in defining complex schedules.

Sample cron expressions:

- Every minute: `* * * * *`
- Every 5 minutes: `*/5 * * * *`
- Every hour: `0 * * * *`
- Daily at midnight: `0 0 * * *`

## Uptime Calculation {#uptime-calculation}

Uptime is calculated based on the number of successful checks versus the total number of checks performed over a specified period. The default formula used is:

```
			UP + MAINTENANCE
------------------------------------  x 100
 UP + MAINTENANCE + DEGRADED + DOWN
```

You can customize the uptime calculation formula in the settings to fit your monitoring needs.

## Monitor Types {#monitor-types}

Kener supports various types of monitors to cater to different monitoring needs:

- [API Monitors](/docs/monitors/api): Monitor HTTP/HTTPS endpoints for uptime and response validation.
- [Ping Monitors](./ping.md): Use ICMP to check the availability of servers
