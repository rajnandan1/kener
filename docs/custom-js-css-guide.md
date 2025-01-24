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
