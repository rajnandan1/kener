---
title: Embed Monitor | Kener
description: Embed your monitor in your website
---

# Embed Monitor

There are two ways to embed your monitor in your website

## Javascript

You can embed your monitor in your website using javascript. We recommend using this method as it takes care of the height of the embedded monitor.

```html
<script
	async
	src="http://[hostname]/embed-[tag]/js?theme=light&monitor=http://[hostname]/embed-[tag]"
></script>
```

Here is an example

```html
<script
	async
	src="https://kener.ing/embed-okbookmarks/js?theme=light&monitor=https://kener.ing/embed-okbookmarks"
></script>
```

### Parameters

You can pass the following parameters to the embed code

-   `theme`: You can pass `light` or `dark` theme
-   `monitor`: The monitor url
-   `bgc`: Background color of the monitor. Only supports hex color codes. DO NOT include the `#` symbol

Replace `[hostname]` with your kener hostname and `[tag]` with your monitor tag.

### Demo

<div class="border mx-auto rounded-sm w-585px">
	<script async src="/embed-okbookmarks/js?theme=dark&monitor=/embed-okbookmarks"></script>
</div>

## Iframe

This is the simplest way to embed your monitor in your website. You can use the following code to embed your monitor in your website.

```html
<iframe
	src="http://[hostname]/embed-[tag]?theme=light"
	width="100%"
	height="200"
	allowfullscreen="allowfullscreen"
	allowpaymentrequest
	frameborder="0"
></iframe>
```

Here is an example

```html
<iframe
	src="https://kener.ing/embed-okbookmarks?theme=light"
	width="100%"
	height="200"
	allowfullscreen="allowfullscreen"
	allowpaymentrequest
	frameborder="0"
></iframe>
```

Replace `[hostname]` with your kener hostname and `[tag]` with your monitor tag.

### Parameters

You can pass the following parameters to the embed code

-   `theme`: You can pass `light` or `dark` theme
-   `bgc`: Background color of the monitor. Only supports hex color codes. DO NOT include the `#` symbol

### Demo

<div class="border mx-auto rounded-sm w-585px">
	<iframe src="/embed-okbookmarks?theme=dark" width="100%" height="200" allowfullscreen="allowfullscreen" allowpaymentrequest frameborder="0"></iframe>
</div>
