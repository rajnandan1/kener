---
title: Site Customizations
description: Configure footer, colors, fonts, theme, announcements, and custom CSS behavior
---

Use **Manage → Customizations** to control visual behavior of the public status page.

## What you can customize {#what-you-can-customize}

- Site footer HTML
- Status colors (light + dark)
- Font source and font family
- Default theme and theme toggle
- Site-wide announcement banner
- Custom CSS (stored now, injection pending)
- Page ordering in the page switcher

## Runtime impact map {#runtime-impact-map}

| Customization  | Stored key                  | Runtime impact                                                |
| -------------- | --------------------------- | ------------------------------------------------------------- |
| Footer         | `footerHTML`                | Rendered by public footer component                           |
| Status colors  | `colors`, `colorsDark`      | Injected as CSS variables in public layout `<head>`           |
| Font           | `font` (`cssSrc`, `family`) | Loads font stylesheet and applies global `--font-family`      |
| Theme defaults | `theme`, `themeToggle`      | Sets initial mode and controls whether users can toggle theme |
| Announcement   | `announcement`              | Renders site banner when title + message are present          |
| Custom CSS     | `customCSS`                 | Injected as `<style>` block in public layout `<head>`         |
| Page ordering  | `pageOrderingSettings`      | Controls page display order in the public page switcher       |

## Footer HTML {#footer-html}

Footer content is rendered as HTML on the public page.

> [!CAUTION]
> Keep footer HTML trusted and minimal. It is rendered directly.

## Colors and fonts {#colors-and-fonts}

Color settings feed CSS variables for status/accent colors in the public layout. Font settings:

- load `font.cssSrc` as stylesheet
- set `--font-family`
- apply global font family

## Theme and announcement {#theme-and-announcement}

- `theme` sets default mode (`light`, `dark`, `system`)
- `themeToggle` controls whether users can switch theme in UI
- announcement banner appears when both `title` and `message` are set

## Custom CSS {#custom-css-status}

`customCSS` is injected as a `<style>` block in the public layout `<head>`. Do not include `<style>` tags — only raw CSS.

Use Custom CSS to override styles, add `@font-face` rules for self-hosted fonts, or customize the status page appearance beyond the built-in settings.

See [Custom Fonts guide](/docs/v4/guides/custom-fonts) for font-specific examples.

## Page ordering {#page-ordering}

Control the display order of pages in the public page switcher.

- **Enable custom page ordering** — when enabled, pages appear in the saved order instead of creation order.
- Use the up/down arrows to reorder pages.
- New pages added after saving will appear at the end of the list automatically.
- Disabling ordering reverts the public display to default (creation order) but preserves your saved order for later re-enabling.

Stored as `pageOrderingSettings` with `enabled` (boolean) and `order` (array of page IDs).

## Verify changes {#verify-changes}

- Update footer and refresh page.
- Change color values and confirm status/accent colors update.
- Set font URL/family and confirm typography changes.
- Toggle theme settings and verify theme toggle visibility.
- Create announcement and verify banner appears.
- Enable page ordering, reorder pages, and verify the page switcher reflects the new order.
