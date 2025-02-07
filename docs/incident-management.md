---
title: Incident Management | Kener
description: Kener uses Github to power incident management using labels
---

# Incident Management

Kener lets you manage incidents using its dashboard or APIs.

## Create Incident

### Incident Title

<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

The title of the incident. This is used to identify the incident in the dashboard.

### Incident Summary

<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

A brief summary of the incident. This is used to give a brief overview of the incident.

### Incident Start Date Time

<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

The start date and time of the incident.

<div class="note info">
Each incident once created will be in INVESTIGATING status. You can update the status of the incident by adding updates as discussed below
</div>

---

## Update Incident

Add comments to the incident to update the status of the incident.

### Time Stamp

<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

### Message

<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

The message to be added to the incident.

### Status

<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

The status of the incident. This can be `INVESTIGATING`, `IDENTIFIED`, `MONITORING`, `RESOLVED`.

### Close Incident

To close an incident, you need to add a message and set the status to `RESOLVED`.

---

## Add Monitors

To add monitors to the incident, you need to add the monitor tag to the incident. This will automatically add the monitor to the incident. You will also get the status of the monitor in the incident. This can be `DEGRADED` or `DOWN`.

## Maintenance

You can also create a maintenance incident. This is similar to an incident but is used to notify users about maintenance activities. Both start and end date and time are required for maintenance incidents.
