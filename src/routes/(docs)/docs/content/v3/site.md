---
title: Site Info Setup | Kener
description: Learn how to set up and work with site info in kener.
---

Site info is used to define the site information that will be shown on the status page.

## Site Title {#site-title}

<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

The site title is used to define the title of the site. It is required and has to be a string. It what will be shown on the browser tab. This will become

Example: `Kener - Open-Source and Modern looking Node.js Status Page for Effortless Incident Management`

```html
<title>Kener - Open-Source and Modern looking Node.js Status Page for Effortless Incident Management</title>
```

![Site Title](/documentation/ms_1.png)

## Site Name {#site-name}

<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

This will be shown as a brand name on the status page on the nav bar top left.

![Site Name](/documentation/s_2.png)

## Home Location {#home-location}

<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

Link to redirect to when Site Name or logo is clicked. Can be your main website. or it can be `/` to be current page. If you are using a base path it should be `/base-path` to keep the the user on the same page.

## Logo {#logo}

Same as Site Name, it is placed left of Site Name as shown in image above

## Favicon {#favicon}

Favicon to be shown in browser tab.
