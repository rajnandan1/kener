---
title: Monitor Visibility
description: Control where a monitor appears on your public site with five settings
---

Five settings decide where a monitor appears on your public site. Two of them, `status` and `is_hidden`, apply across the public site. The other three only narrow things down further.

On this page, a hidden monitor is a monitor with `is_hidden = YES`. The rules describe what anonymous visitors see. A signed-in user whose role has the `monitors.read` permission also sees hidden monitors on some pages. See [Signed-in viewers](#signed-in-viewers).

## The settings {#settings}

### status {#status}

The values are `ACTIVE` and `INACTIVE`. The default is `ACTIVE`. An `INACTIVE` monitor runs no checks. It also disappears from status pages, its monitor page, badges, embeds, RSS feeds, and the sitemap. Events still list it as an affected monitor.

You set it with the **Active** switch in **Manage → Monitors**, or in the monitor's **General Settings**.

### is_hidden {#is-hidden}

The values are `YES` and `NO`. The default is `NO`. A hidden monitor disappears from the public site, except inside [group monitors](#group-monitors) and for [signed-in viewers](#signed-in-viewers) with `monitors.read`. Its checks and alerts keep running.

You set it with the **Visible** switch in **Manage → Monitors**, or with **Hidden in Status Page** in the monitor's **General Settings**.

> [!NOTE]
> The **Visible** switch shows the opposite of `is_hidden`. When the switch is on, `is_hidden` is `NO`.

### Page membership {#page-membership}

A status page lists only the monitors that you add to it. A new monitor is on no page. You add a monitor to a page in **Manage → Pages → _(page)_ → Page Monitors**.

### forceExclusivity {#force-exclusivity}

This site setting is stored as `globalPageVisibilitySettings.forceExclusivity`. The values are `true` and `false`. The default is `false`. When it is `true`, the root events page and `/rss.xml` include only monitors on the default page. The logo also links to the current page instead of `/`.

You set it in **Manage → Site Configurations**. See [Site Configuration](/docs/v4/setup/site-configuration#global-page-visibility-settings).

### Sharing options {#sharing-options}

Each monitor has two sharing settings, `showShareBadgeMonitor` and `showShareEmbedMonitor`. **Site Configurations** has the same two settings for the whole site. The values are `true` and `false`. The default is `true`. These settings only show or hide the **Badges** and **Embed** buttons on the monitor page.

> [!WARNING]
> Sharing settings do not block badge or embed URLs. Anyone who has a URL can still load it. To block the URLs, set `is_hidden = YES`.

You set them in the monitor's **Sharing Options** and in **Manage → Site Configurations**. See [Sharing Monitors](/docs/v4/sharing).

## What the public sees {#what-the-public-sees}

1. When a monitor is `ACTIVE`, not hidden, and on a page, that page lists it. Its monitor page, badges, and embeds work. Its checks and alerts run.
2. When a monitor is `ACTIVE`, not hidden, and on no page, no status page lists it. Its monitor page, badges, and embeds still work. Its checks and alerts run.
3. When a monitor is `ACTIVE` and hidden, no status page lists it. Its monitor page returns 404. Its badges and embeds show an error. Its checks and alerts run.
4. When a monitor is `INACTIVE`, no status page lists it. Its monitor page returns 404. Its badges and embeds show an error. Its checks and alerts stop.

> [!IMPORTANT]
> A monitor that is on no page is still public. Its monitor page, badges, embeds, and sitemap entry stay public. To take it off the public site, set `is_hidden = YES`.

## Where each rule applies {#where-each-rule-applies}

- The status pages `/` and `/{page_path}` list monitors that are on the page, `ACTIVE`, and not hidden. The page banner status counts only these monitors.
- The monitor page `/monitors/{tag}` opens only for a monitor that is `ACTIVE` and not hidden. It does not check page membership.
- Badges at `/badge/{tag}/...` follow the same rule as the monitor page. For any other monitor, the badge shows an error. The `_` badge covers every `ACTIVE` monitor on the site that is not hidden.
- Embeds at `/embed/monitor-{tag}` and `/embed/latency-{tag}` get their data from `/dashboard-apis/*`. That API returns 404 for a monitor that is hidden or `INACTIVE`.
- The per-monitor RSS feed `/monitors/{tag}/rss.xml` returns 404 for a monitor that is hidden or `INACTIVE`.
- On events pages, in inline events, in the notifications list, and in page RSS feeds, each event stays listed. Kener removes hidden monitors from the event's list of affected monitors. A page-scoped list shows an event only when the event is global (`is_global = YES`) or affects a monitor that is on the page, `ACTIVE`, and not hidden. On `/monitors/{tag}`, inline events and notifications follow the same rule for that one monitor, so a hidden monitor's page shows only global events. These rules are the same for every viewer, signed-in users included.
- Subscriber emails do not name hidden monitors. Kener emails subscribers about an event only when the event is global (`is_global = YES`) or affects a monitor that is not hidden. The incident impact in the email, `DOWN` or `DEGRADED`, counts only monitors that are not hidden.
- `sitemap.xml` includes every monitor that is `ACTIVE` and not hidden.
- The REST API `/api/v4/*` needs an API key. It returns every monitor. To get only public monitors, add `?status=ACTIVE&is_hidden=NO`. See [API Reference](/docs/spec/v4/).
- The Manage dashboard shows every monitor.

> [!NOTE]
> Event lists filter only on `is_hidden`. An `INACTIVE` monitor that is not hidden still appears in an event's list of affected monitors.

## Signed-in viewers {#signed-in-viewers}

A signed-in user whose role has `monitors.read` sees hidden monitors on the pages that load with their session. The built-in roles `admin`, `editor`, and `member` all have `monitors.read`. A signed-in user whose custom role lacks it sees what an anonymous visitor sees. See [Roles and permissions](/docs/v4/user-management#roles-and-permissions).

| Surface                                                                            | Anonymous | Signed in, no `monitors.read` | Signed in, `monitors.read`           |
| ---------------------------------------------------------------------------------- | --------- | ----------------------------- | ------------------------------------ |
| `/` and `/{page_path}`                                                             | Hides     | Hides                         | Shows, if the monitor is on the page |
| `/monitors/{tag}`, with its status bars, charts, and day details                   | Hides     | Hides                         | Shows                                |
| Group member list                                                                  | Hides     | Hides                         | Shows                                |
| `/incidents/{id}` and `/maintenances/{id}` affected monitors                       | Hides     | Hides                         | Shows                                |
| Inline events, notifications, and events pages ([rules](#where-each-rule-applies)) | Hides     | Hides                         | Hides                                |
| Badges and embeds                                                                  | Hides     | Hides                         | Hides                                |
| `/rss.xml`, `/{page_path}/rss.xml`, and `/monitors/{tag}/rss.xml`                  | Hides     | Hides                         | Hides                                |
| `sitemap.xml`                                                                      | Hides     | Hides                         | Hides                                |
| Subscriber emails                                                                  | Hides     | Hides                         | Hides                                |

The status page still shows only `ACTIVE` monitors, for every viewer. A hidden monitor appears on a status page only when you add it to that page.

Kener sends `Cache-Control: private` on every response to a signed-in request, unless the route sets its own header. A shared cache, such as a CDN, does not store these responses.

> [!WARNING]
> A CDN rule that ignores the origin's `Cache-Control` header can still cache a signed-in page and serve its hidden monitors to anonymous visitors. Do not cache HTML or `/dashboard-apis/*` responses for requests that carry the `kener-user` cookie.

## Group monitors {#group-monitors}

A [group monitor](/docs/v4/monitors/group) computes its status from all of its members, hidden or not. A hidden member still changes the group's status. The group's member list still counts the hidden member. For an anonymous visitor, that list shows an error row for it instead of its name. To remove the group from the public site, hide the group itself.

## Verify {#verify}

1. In the monitor's **General Settings**, turn on **Hidden in Status Page**.
2. Save the monitor.
3. Open `/monitors/{tag}` in a private window. Expect a 404 page.
4. Run `curl -s https://status.example.com/badge/{tag}/status`. Expect the error badge.
5. Run `curl -s -H "Authorization: Bearer $KENER_API_KEY" "https://status.example.com/api/v4/monitors?is_hidden=YES"`. Expect the monitor in the list.
6. Sign in as a user whose role has `monitors.read`, then open `/monitors/{tag}` in the same window. Expect the monitor page.

## Related pages {#related-pages}

- [Pages](/docs/v4/pages)
- [Sharing Monitors](/docs/v4/sharing)
- [Site Configuration](/docs/v4/setup/site-configuration)
- [RSS Feed](/docs/v4/rss-feed)
