---
title: SSL Monitors | Kener
description: Monitor the SSL certificate of a domain
---

# SSL Monitors

SSL monitors are used to monitor the SSL certificate of a domain. You can monitor the SSL certificate of a domain by adding the domain name to the monitor. The SSL monitor will check the SSL certificate of the domain and notify you if the SSL certificate is about to expire.

<div class="border rounded-md">

![Monitors SSL](/documentation/m_ssl.png)

</div>

## Host

<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

The host is the domain name of the website you want to monitor. The host should be a valid domain name.

## Port

<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

The port is the ssl port of the website you want to monitor. The default ssl port is 443.

## Degraded If

<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

Set this to the number of hours that still remains for the certificate to expire. If the certificate is about to expire in the given number of hours, the monitor status will be set to degraded. Example if you send the value to be 24, the monitor status will be set to degraded if the certificate is about to expire in 24 hours.

## Down If

<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

Set this to the number of hours that still remains for the certificate to expire. If the certificate is about to expire in the given number of hours, the monitor status will be set to down. Example if you send the value to be 12, the monitor status will be set to down if the certificate is about to expire in 12 hours.

<div class="note">

`Degraded If` should be more than `Down If`.

</div>
