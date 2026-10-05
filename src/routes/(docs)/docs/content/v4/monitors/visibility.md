---
title: Monitor Visibility
description: Control where a monitor appears publicly with the status, hidden, page, exclusivity, and sharing flags
---

Five settings decide where a monitor shows up on your public status site. Two of them (`status` and `is_hidden`) apply everywhere. The other three only narrow things down further.

## The flags {#flags}

| Flag                                                             | Set it in                                                                              | Values                | Default     | What it controls                                                                     |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------- | ----------- | ------------------------------------------------------------------------------------ |
| `status`                                                         | **Manage → Monitors** (Active switch) or the monitor's General Settings                | `ACTIVE` / `INACTIVE` | `ACTIVE`    | `INACTIVE` stops all checks and removes the monitor from every public surface.       |
| `is_hidden`                                                      | **Manage → Monitors** (Visible switch) or **General Settings → Hidden in Status Page** | `YES` / `NO`          | `NO`        | `YES` removes the monitor from every public surface. Checks and alerts keep running. |
| Page membership                                                  | **Manage → Pages → _(page)_ → Page Monitors**                                          | on page / not on page | not on page | Which status pages list the monitor.                                                 |
| `globalPageVisibilitySettings.forceExclusivity`                  | **Manage → Site Configurations**                                                       | `true` / `false`      | `false`     | Scopes the root events page, root RSS feed, and logo link to the current page.       |
| `sharing_options.showShareBadgeMonitor`, `showShareEmbedMonitor` | Monitor **Sharing Options** and **Site Configurations**                                | `true` / `false`      | `true`      | Only shows or hides the Badges and Embed buttons on the monitor page.                |

> [!NOTE]
> In the monitors list, the **Visible** switch shows the opposite of `is_hidden`: switch on means `is_hidden = NO`.

## What the public sees {#what-the-public-sees}

| `status`   | `is_hidden` | On a page? | Status page | `/monitors/{tag}` | Badges and embeds | Checks and alerts |
| ---------- | ----------- | ---------- | ----------- | ----------------- | ----------------- | ----------------- |
| `ACTIVE`   | `NO`        | Yes        | Listed      | Opens             | Work              | Run               |
| `ACTIVE`   | `NO`        | No         | Not listed  | Opens             | Work              | Run               |
| `ACTIVE`   | `YES`       | Any        | Not listed  | 404               | Error             | Run               |
| `INACTIVE` | Any         | Any        | Not listed  | 404               | Error             | Stopped           |

> [!IMPORTANT]
> Leaving a monitor off every page does **not** make it private. Its monitor page, badges, embeds, and sitemap entry stay public. Set `is_hidden = YES` to take it off the public site.

## Where each rule applies {#where-each-rule-applies}

| Surface                                               | Rule                                                                                                                                                                                                                                      |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status page `/` and `/{page_path}`                    | Lists monitors that are on the page, `ACTIVE`, and not hidden. The page banner status counts only these monitors.                                                                                                                         |
| Monitor page `/monitors/{tag}`                        | Needs `ACTIVE` and not hidden. Page membership is not checked.                                                                                                                                                                            |
| Badges `/badge/{tag}/...`                             | Same as the monitor page. Otherwise the badge shows an error. The `_` badge covers every `ACTIVE`, non-hidden monitor on the site.                                                                                                        |
| Embeds `/embed/monitor-{tag}`, `/embed/latency-{tag}` | Data comes from `/dashboard-apis/*`, which returns 404 for hidden or inactive monitors.                                                                                                                                                   |
| Per-monitor RSS `/monitors/{tag}/rss.xml`             | Returns 404 for hidden or inactive monitors.                                                                                                                                                                                              |
| Events pages and page RSS feeds                       | Events stay listed. Hidden monitors are removed from each event's affected-monitor list. A page-scoped list shows an event only when it is global (`is_global = YES`) or touches a monitor that is on the page, `ACTIVE`, and not hidden. |
| `sitemap.xml`                                         | Includes `ACTIVE`, non-hidden monitors.                                                                                                                                                                                                   |
| REST API `/api/v4/*`                                  | Needs an API key and returns every monitor. Filter with `?status=ACTIVE&is_hidden=NO`. See [API Reference](/docs/v4/api-reference).                                                                                                       |
| Manage dashboard                                      | Shows every monitor.                                                                                                                                                                                                                      |

> [!NOTE]
> Events filter on `is_hidden` only. An `INACTIVE` monitor that is not hidden still appears in an event's affected-monitor list.

## Group monitors {#group-monitors}

A [group monitor](/docs/v4/monitors/group) computes its status from all of its members, hidden or not. Hiding a member keeps it out of public lists, but it still moves the group's status. To remove the group from the public site, hide the group itself.

## Exclusivity {#exclusivity}

With `forceExclusivity` on, the root events page and `/rss.xml` only include monitors on the default page, and the logo links to the current page. See [Site Configuration](/docs/v4/setup/site-configuration#global-page-visibility-settings).

## Sharing options do not hide data {#sharing-options}

> [!WARNING]
> Turning off `showShareBadgeMonitor` or `showShareEmbedMonitor` only removes the share buttons from the monitor page. Badge and embed URLs keep working for anyone who has them. To block them, set `is_hidden = YES`.

See [Sharing Monitors](/docs/v4/sharing).

## Verify {#verify}

1. Set the monitor to **Hidden** and save.
2. Open `/monitors/{tag}` in a private window. Expect a 404.
3. Run `curl -s https://status.example.com/badge/{tag}/status`. Expect the error badge.
4. Run `curl -s -H "Authorization: Bearer $KENER_API_KEY" "https://status.example.com/api/v4/monitors?is_hidden=YES"`. Expect the monitor in the list.

## Related pages {#related-pages}

- [Pages](/docs/v4/pages)
- [Sharing Monitors](/docs/v4/sharing)
- [Site Configuration](/docs/v4/setup/site-configuration)
- [RSS Feed](/docs/v4/rss-feed)
