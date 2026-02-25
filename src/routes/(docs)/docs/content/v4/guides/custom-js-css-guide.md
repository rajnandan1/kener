---
title: Custom JS and CSS Guide
description: Add custom JavaScript and CSS to your Kener instance with static files or inline CSS
---

Use this guide to customize Kener with your own JavaScript and CSS.

## Add custom JavaScript {#add-custom-javascript}

1. Add your JS file to `static/` (for example `static/custom.js`).
2. Open `src/app.html`.
3. Add your script tag before `</body>`:

```html
<script src="/custom.js"></script>
```

## Add custom CSS {#add-custom-css}

You can add CSS using either a file or inline CSS.

### Option 1: CSS file {#option-1-css-file}

1. Add your CSS file to `static/` (for example `static/custom.css`).
2. Open `src/app.html`.
3. Add this in `<head>`:

```html
<link rel="stylesheet" href="/custom.css" />
```

If you use a subpath deployment, include the base path in the asset URL.

Example with `/status` base path:

```html
<script src="/status/custom.js"></script>
<link rel="stylesheet" href="/status/custom.css" />
```

For subpath setup details, see [Base Path Deployment](/docs/v4/guides/base-path).

### Option 2: Inline CSS in dashboard {#option-2-inline-css}

1. Go to **Manage → Customizations → Custom CSS**.
2. Add raw CSS.
3. Click **Save Custom CSS**.

```css
.my-class {
    color: red;
}
```

> [!CAUTION]
> Do not include `<style>` tags in the Custom CSS editor.

## Card border radius example {#card-border-radius-example}

Use this CSS to make all card components square (border radius `0`) without Tailwind utility classes:

```css
.rounded-3xl,
.rounded-xl,
.rounded-2xl,
.rounded-md,
.rounded-btn,
.rounded-full {
    border-radius: 0 !important;
}
```

## Verify changes {#verify-changes}

1. Hard-refresh your status page.
2. Open browser DevTools and confirm custom JS/CSS files load without 404 errors.
3. Confirm your visual changes are applied.
