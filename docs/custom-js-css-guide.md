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

Add your custom CSS to `static/` file. And in the `src/app.html` file, add the following line:

```html
<link rel="stylesheet" href="/your-custom-css-file.css" />
```

Do not forget to add the base path if you are using a subpath. For example, if you are using a subpath `/kener`, then the path should be `/kener/your-custom-js-file.js`.
