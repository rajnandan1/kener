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
	src="http://[hostname]/embed/monitor-[tag]/js?theme=light&monitor=http://[hostname]/embed/monitor-[tag]"
></script>
```

Here is an example

```html
<script
	async
	src="https://kener.ing/embed/monitor-earth/js?theme=light&monitor=https://kener.ing/embed/monitor-earth"
></script>
```

### Parameters

You can pass the following parameters to the embed code

-   `theme`: You can pass `light` or `dark` theme
-   `monitor`: The monitor url
-   `bgc`: Background color of the monitor. Only supports hex color codes. DO NOT include the `#` symbol. Example: `ff0000`
-   `locale`: The locale of the monitor. You can pass the code of the locale you have enabled in your kener settings. Example: `en`, `fr` etc

Replace `[hostname]` with your kener hostname and `[tag]` with your monitor tag.

### Demo

<div class="border mx-auto rounded-sm w-585px">
	<script async src="/embed/monitor-earth/js?theme=dark&monitor=/embed/monitor-earth"></script>
</div>

## Iframe

This is the simplest way to embed your monitor in your website. You can use the following code to embed your monitor in your website.

```html
<iframe
	src="http://[hostname]/embed/monitor-[tag]?theme=light"
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
	src="https://kener.ing/embed/monitor-earth?theme=light"
	width="100%"
	height="100"
	allowfullscreen="allowfullscreen"
	allowpaymentrequest
	frameborder="0"
></iframe>
```

Replace `[hostname]` with your kener hostname and `[tag]` with your monitor tag.

### Parameters

You can pass the following parameters to the embed code

-   `theme`: You can pass `light` or `dark` theme
-   `bgc`: Background color of the monitor. Only supports hex color codes. DO NOT include the `#` symbol. Example: `ff0000`
-   `locale`: The locale of the monitor. You can pass the code of the locale you have enabled in your kener settings. Example: `en`, `fr` etc

### Demo

<div class="border mx-auto rounded-sm w-585px">
	<iframe src="/embed/monitor-earth?theme=dark" width="100%" height="100" allowfullscreen="allowfullscreen" allowpaymentrequest frameborder="0"></iframe>
</div>
