---
title: Pages
description: Create and configure status pages, monitor visibility, and display preferences
---

Use Pages to create separate status views (for example: `home`, `services`, or `infrastructure`) and control which monitors appear on each page.

## Create a page {#create-a-page}

1. Open **Manage → Pages**.
2. Click **New Page**.
3. Fill required fields:
    - **Path** (URL segment)
    - **Title**
    - **Header**
4. Click **Create Page**.

> [!NOTE]
> The page path is automatically sanitized to a URL-friendly value (lowercase, spaces become `-`).

> [!IMPORTANT]
> The default home page (`/`) is created by default. You cannot change its path and you cannot delete it.

## General information fields {#general-information-fields}

| Field          | Required | Description                                     |
| -------------- | -------- | ----------------------------------------------- |
| `Path`         | Yes      | URL path for the page (for example `services`). |
| `Title`        | Yes      | Browser tab title.                              |
| `Header`       | Yes      | Main heading shown on the status page.          |
| `Page Content` | No       | Markdown content shown under the header.        |
| `Page Logo`    | No       | Optional logo image for the page.               |

## Add monitors to a page {#add-monitors-to-a-page}

In **Page Monitors**:

1. Select a monitor from the dropdown.
2. Click **Add**.
3. Repeat for all monitors you want on this page.

Remove a monitor by clicking the remove button next to it.

> [!IMPORTANT]
> Only monitors added to a page are shown on that page.

## Display settings {#display-settings}

Each page has its own display preferences.

### Monitor status history days {#monitor-status-history-days}

- **Desktop days**: how many days of status history to show on desktop.
- **Mobile days**: how many days of status history to show on mobile.

### Monitor layout style {#monitor-layout-style}

Choose one layout:

- `default-list`
- `default-grid`
- `compact-list`
- `compact-grid`

Click **Save Preferences** after changes.

## Social preview and SEO {#social-preview-and-seo}

Each page can override the site-level SEO defaults set in [Site Configuration](/docs/v4/setup/site-configuration#social-preview-and-seo).

| Field                  | Description                                                   |
| ---------------------- | ------------------------------------------------------------- |
| `Meta Title`           | Custom `<title>` and `og:title` for this page.                |
| `Meta Description`     | Custom `<meta name="description">` and `og:description`.      |
| `Social Preview Image` | Custom `og:image` and `twitter:image` shown in link previews. |

When a field is left empty, the site-level value is used. When the site-level value is also empty, the page title and header are used as automatic fallbacks.

**Override hierarchy**: Page setting → Site setting → Auto-generated from page title/header.

> [!TIP]
> Upload a 1200×630 image for best results across social platforms.

## Page access {#page-access}

Use **Page Access** on a page to decide who can see it. A page lists access groups, and a role lists the groups its users belong to (see [Page access for roles](/docs/v4/user-management#page-access)).

| Page groups                  | Who sees the page                                                          |
| ---------------------------- | -------------------------------------------------------------------------- |
| includes **Public**          | Everyone, signed in or not                                                 |
| custom groups, no **Public** | Signed-in users whose role shares a group, plus administrators             |
| none                         | Only the Administrator role and roles in the **All pages** (`admin`) group |

Everyone else gets **Page not found**, as if the page did not exist. The page is also left out of the page switcher and the sitemap, its events return **Page not found**, and its RSS feed (`/<page_path>/rss.xml`) works only while the page is public.

New pages are public unless **New pages are public** is turned off in [Site Configuration](/docs/v4/setup/site-configuration#page-access). Pages that existed before the upgrade stay public.

> [!IMPORTANT]
> Access groups hide pages, not monitors. A monitor on a restricted page still has its own page at `/monitors/<tag>`, its badges and embeds. Hide the monitor too if those must stay private. See [Monitor visibility](/docs/v4/monitors/visibility).

> [!NOTE]
> Restricting the home page shows **Page not found** at the site root to visitors who are not signed in.

Visitors sign in at `/account/signin` and then open the page again.

## Delete a page {#delete-a-page}

Non-home pages can be deleted from **Danger Zone**.

To confirm deletion, type:

```text
delete <page_path>
```

Example:

```text
delete services
```

## Manage pages via API {#manage-pages-via-api}

Pages support full CRUD through the v4 REST API (`/api/v4/pages`), including assigning monitors and access groups (`access_groups`). Access groups themselves are listed, created and deleted under `/api/v4/access-groups`. The home page has an empty stored path, so the API addresses it with the special segment `~home` (for example `PATCH /api/v4/pages/~home`); its path cannot be changed and it cannot be deleted. See the [API Reference](/docs/spec/v4/) for endpoints and schemas.

## Tips {#tips}

- Keep page paths short and stable (changing links later is disruptive).
- Create pages by audience (for example: public services vs internal systems).
- Add only relevant monitors per page to keep status pages readable.
- Use [Sharing Monitors](/docs/v4/sharing) to control badge/embed visibility per monitor.
