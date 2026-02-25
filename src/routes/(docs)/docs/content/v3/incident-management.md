---
title: Incident Management | Kener
description: Kener uses GitHub to power incident management using labels
---

Kener lets you manage incidents using its dashboard or APIs.

## Create Incident {#create-incident}

### Incident Title {#incident-title}

<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

The title of the incident. This is used to identify the incident in the dashboard.

### Incident Summary {#incident-summary}

<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

A brief summary of the incident. This is used to give a brief overview of the incident.

### Incident Start Date Time {#incident-start-date-time}

<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

The start date and time of the incident.

<div class="note info">
Each incident once created will be in INVESTIGATING status. You can update the status of the incident by adding updates as discussed below
</div>

---

## Update Incident {#update-incident}

Add comments to the incident to update the status of the incident.

### Timestamp {#update-timestamp}

<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

### Message {#update-message}

<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

The message to be added to the incident.

### Status {#update-status}

<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

The status of the incident. This can be `INVESTIGATING`, `IDENTIFIED`, `MONITORING`, `RESOLVED`.

### Close Incident {#close-incident}

To close an incident, you need to add a message and set the status to `RESOLVED`.

---

## Add Monitors to Incident {#add-monitors-to-incident}

To add monitors to the incident, you need to add the monitor tag to the incident. This will automatically add the monitor to the incident. You will also get the status of the monitor in the incident. For any event type, this can be `DEGRADED` or `DOWN`. For maintenance event type, this can also be `MAINTENANCE`.

## Maintenance Incidents {#maintenance-incidents}

You can also create a maintenance incident. This is similar to an incident but is used to notify users about maintenance activities. Both start and end date and time are required for maintenance incidents.
