---
title: DNS Monitors | Kener
description: Learn how to set up and work with DNS monitors in kener.
---

# DNS Monitors

DNS monitors are used to monitor DNS servers. Verify DNS queries for your server and match values with the expected values to get notified when they are different.

<div class="border rounded-md">

![Monitors Ping](/documentation/m_dns.png)

</div>

## Host

<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

The host is used to define the host of the DNS server that you want to monitor. It is required and has to be a valid host.

## Lookup Record

<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

The query is used to define the query that you want to monitor. It is required and has to be a valid query. Example: `A`, `MX`, `TXT`, `CNAME`.

## Name Server

<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

The name server is the DNS server that you want to query. It is required and has to be a valid DNS server.

Few examples:

-   8.8.8.8 (Google)
-   1.1.1.1 (Cloudflare)

## Match Type

<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

Match type for DNS response. Can be ANY or ALL. If ANY is selected, the monitor will be marked as UP if any of the expected values match the response. If ALL is selected, all the expected values should match the response.

## Expected Values

<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

The expected values are the values that you expect the DNS server to return. You can add multiple values. Atleast one is required.
