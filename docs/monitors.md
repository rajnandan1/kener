---
title: Monitors | Kener
description: Monitors are the heart of Kener. This is where you define the monitors you want to show on your site.
---

# Monitors

Monitors are the heart of Kener. This is where you define the monitors you want to show on your site.

<div class="border rounded-md">

![Monitors Main](/m_main.png)

</div>

## Tag

<span class="text-red-500 text-xs font-semibold">
	UNIQUE
</span>
&
<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

The tag is unique to each monitor and is used to identify the monitor in the code. It is also used to generate the URL for the monitor.

## Name

<span class="text-red-500 text-xs font-semibold">
	UNIQUE
</span>
&
<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

Name is also unique to each monitor and is used to identify the monitor in the admin panel or in the status page.

## Image

The image is used to display a logo or an image for the monitor. It is displayed on the status page and in the admin panel. It is optional.

## Description

The description is used to describe the monitor. It is displayed on the status page and in the admin panel. It is optional.

## Cron

<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

The cron is used to define the interval at which the monitor should run. It is a cron expression. For example, `* * * * *` will run the monitor every minute.

## Default Status

Using default status you can set a predefined status for the monitor. The predefined status can be `UP`, `DOWN`, or `DEGRADED`. If the monitor does not have api/dns/ping or if the monitor status is not updated using webbhook, manual incident this will the status of the monitor.

## Category Name

The category name is used to group monitors. It is displayed on the status page and in the admin panel. It is optional. By a home category is already present. Adding monitor to the home category will show the monitor on the home page.

## Day Degraded Min Count

<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

The day degraded minimum count is used to define the minimum number of degraded incidents in a day to mark the monitor as degraded for the day. A degraded day means if you are using Monitor Style as FULL under Theme, the whole bar will be shown as Degraded (yellow color) . It is optional. It has to be more than equal to 1

## Day Down Min Count

<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

The day down minimum count is used to define the minimum number of down incidents in a day to mark the monitor as down for the day. A down day means if you are using Monitor Style as FULL under Theme, the whole bar will be shown as Down (red color) . It is optional. It has to be more than equal to 1

## Include Degraded

The include degraded is used to include the degraded checks in the total bad checks count. It is optional. By default uptime percentage is calculated as (UP+DEGRADED/UP+DEGRADED+DOWN). Setting it as `YES` will change the calculation to (UP/UP+DEGRADED+DOWN)

## Monitor Type

<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

### API

To monitor an API, you need to provide the URL of the API and the expected status code. If the status code is not received, the monitor will be marked as down. You can read more about API monitoring [here](/docs/monitors-api).

### DNS

To monitor the DNS records, you need to provide the domain name and the record type. If the record is not found, the monitor will be marked as down. You can read more about DNS monitoring [here](/docs/monitors-dns).

### PING

To monitor the ping, you need to provide the IP address or the domain name. If the ping is not successful, the monitor will be marked as down. You can read more about PING monitoring [here](/docs/monitors-ping).
