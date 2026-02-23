---
title: Site Configuration
description: Configure core site settings and understand where they affect runtime behavior
---

Use **Manage → Site Configurations** to control identity, navigation, monitor sharing controls, retention, and event visibility.

## Quick setup {#quick-setup}

1. Open **Manage → Site Configurations**.
2. Save **Site Information** (`siteName`, `siteURL`, logo, favicon).
3. Configure **Navigation Menu**.
4. Set **Monitor Sub Menu Options**.
5. Configure **Data Retention Policy**.
6. Configure **Event Display Settings**.

## Runtime impact map {#runtime-impact-map}

| Setting area                 | Stored key                           | Runtime impact                                                           |
| ---------------------------- | ------------------------------------ | ------------------------------------------------------------------------ |
| Site name / URL / logo / nav | `siteName`, `siteURL`, `logo`, `nav` | Rendered in top navbar branding and nav links                            |
| Favicon                      | `favicon`                            | Used in `<head>` as page icon                                            |
| Monitor sub menu options     | `subMenuOptions`                     | Gates monitor share actions (badges/embed) on public monitor pages       |
| Data retention policy        | `dataRetentionPolicy`                | Controls daily cleanup of old `monitoring_data`                          |
| Event display settings       | `eventDisplaySettings`               | Filters incidents/maintenances returned for dashboard/home notifications |

## Monitor sub menu options {#monitor-sub-menu-options}

These site-level flags control share actions globally:

- `showShareBadgeMonitor`
- `showShareEmbedMonitor`

> [!IMPORTANT]
> These site-level toggles are combined with monitor-level sharing options. If site-level is disabled, monitor-level cannot force it on.

See [Sharing Monitors](/docs/v4/sharing).

## Data retention policy {#data-retention-policy}

`dataRetentionPolicy` drives the daily cleanup scheduler:

- `enabled`: turn cleanup on/off
- `retentionDays`: how many days of monitor data to keep

When enabled, cleanup runs daily at midnight UTC.

## Event display settings {#event-display-settings}

`eventDisplaySettings` controls which events are visible:

- incidents: ongoing/resolved + resolved limits
- maintenances: ongoing/past/upcoming + limits

This affects:

- event sections on status pages
- notifications payload API used by the UI

## Verify changes {#verify-changes}

- Update site name/logo/nav and refresh home page.
- Toggle monitor share options and verify Badge/Embed actions on a monitor page.
- Change event display settings and verify incident/maintenance visibility.
- Set retention policy and confirm scheduler logs in server output.
