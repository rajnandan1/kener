---
title: Custom JS and CSS Guide | Kener
description: Custom JS and CSS Guide for Kener
---

Here is a guide to add custom JS and CSS to your Kener instance.

## Adding Custom JS

Add your custom JS to `static/` file. And in the `src/app.html` file, add the following line:

```html
<script src="/your-custom-js-file.js"></script>
```

## Adding Custom CSS

Three are two ways you can add custom CSS to your Kener instance.

### CSS file

Add your custom CSS to `static/` file. And in the `src/app.html` file, add the following line:

```html
<link rel="stylesheet" href="/your-custom-css-file.css" />
```

Do not forget to add the base path if you are using a subpath. For example, if you are using a subpath `/kener`, then the path should be `/kener/your-custom-js-file.js`.

### Inline CSS

To add inline css go to Manage kener -> Theme -> Custom CSS and add your CSS there.

```css
.my-class {
    color: red;
}
```

<div class="note danger">
	Do not include &#x3C;style&#x3E; tags.
</div>

## Grid Layout

To change from a column layout to a grid layout in your Kener instance, you can use the following CSS:

```css
@media (min-width: 1330px) {
    .section-monitors,
    .section-categories,
    .section-hero,
    .section-back,
    .section-events,
    .section-legend,
    .section-categories,
    .section-browser-events {
        width: 1330px !important;
        max-width: 1330px !important;
    }

    .section-monitors .monitor-root {
        background-color: transparent;
        border: none !important;
        box-shadow: none;
    }

    .section-monitors .monitor-root .monitors-card {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.5rem;
    }

    .section-monitors .monitor-root .monitors-card .monitor {
        grid-column: span 1;
        border-radius: 0.375rem;
        background-color: hsl(var(--card) / var(--tw-bg-opacity, 1));
        border-width: 1px;
    }
    .section-monitors .monitor-root .monitors-card .monitor:last-child {
        border-bottom: inherit;
        border-bottom-width: 1px !important;
    }
}
```
