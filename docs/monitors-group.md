---
title: Group Monitors | Kener
description: Learn how to set up and work with Group monitors in kener.
---

# Group Monitors

Group monitors are used to monitor multiple monitors at once. You can use Group monitors to monitor multiple monitors at once and get notified when they are down.

<div class="border rounded-md">

![Monitors Group](/documentation/m_group.png)

</div>

## Timeout

<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

The timeout is used to define the time in milliseconds after which the group monitor should timeout.

Let us say the group monitor runs every minute, it will expect in the same minute all the other monitors to finish. It will wait till the timeout for them to complete. If not completed within that timeout, it will be marked as down.

## Monitors

<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

You can add as many monitors as you want to monitor. The minimum number of monitors required is 2. The monitor can be any type of monitor.

## Hide

You can hide the monitors that are part of the group monitor. If you hide the monitors, the monitors inside the group will not be shown in the home page.

<div class="note">
The group status will be the worst status of the monitors in the group.
</div>
