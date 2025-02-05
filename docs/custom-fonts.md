---
title: How to Add Custom Fonts | Kener
description: Kener allows you to add custom fonts to your site. This guide will help you add custom fonts to your Kener site.
---

# Add Custom Fonts

1. Login to your Kener dashboard.
2. Go to the `Theme` page.
3. Scroll down to the `Fonts` section.
4. Remove `Font URL` and `Font Name`
5. In Custom CSS add your font

```css
@font-face {
	font-family: "CustomFont";
	src:
		url("/path-to-font/CustomFont.woff2") format("woff2"),
		url("/path-to-font/CustomFont.woff") format("woff"),
		url("/path-to-font/CustomFont.ttf") format("truetype");
	font-weight: normal;
	font-style: normal;
}
* {
	font-family: "CustomFont", sans-serif;
}
```
