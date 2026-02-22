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

## Tips {#tips}

- Keep page paths short and stable (changing links later is disruptive).
- Create pages by audience (for example: public services vs internal systems).
- Add only relevant monitors per page to keep status pages readable.
- Use [Sharing Monitors](/docs/v4/sharing) to control badge/embed visibility per monitor.
