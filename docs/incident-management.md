---
title: Incident Management | Kener
description: Kener uses Github to power incident management using labels
---

# Incident Management

Kener uses Github to power incident management using labels

## Labels

Kener auto creates labels for your monitors using the `tag` parameter

-   `incident`: If an issue is marked as incident it will show up in kener home page
-   `incident-down`: If an issue is marked as incident-down and incident kener would make that monitor down
-   `incident-degraded`: If an issue is marked as incident-degraded and incident then kener would make the monitor degraded
-   `resolved`: Use this tag to mark the incident has RESOLVED
-   `identified`: Use this tag to show that the root cause of the incident has been identified

## Creating your first incident

-   Go to your github repo of kener
-   Go to issues
-   Create an issue. Give it a title
-   In the body add [start_datetime:1702651340] and [end_datetime:1702651140] and add some description. Time is UTC
-   Add `incident`, `incident-down` and the monitor tag. This will make the monitor down for 4 minutes

If you clone the repo it gives you an issue template to create incidents

Here is a [sample incident](https://github.com/rajnandan1/kener/issues/15) for your reference.
