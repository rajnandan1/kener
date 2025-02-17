---
title: Theme Customization | Kener
description: Learn how to customize the theme of your status page in kener.
---

# Theme Customization

Kener provides you with the ability to customize the theme of your status page. You can change the colors, fonts, and other styles of the status page.

---

## Home Page Pattern

Kener can show a subtle pattern in all your pages. It is either square or dots. Right now you cannot modify the color of the pattern. However, you can disable it by choosing none

---

## Default Theme

Kener comes with both dark and light theme. You can set a default theme that will be used every time the user visits.

Setting it to light or dark will make the theme light or dark respectively. Setting it to none will make the theme change based on the user's system preference. Setting it to system will make the theme change based on the user's system preference.

If you want to force a theme to be light or dark you can set it to light or dark and uncheck `Let Users toggle theme between light and dark`

---

## Monitor Style

You can change how the bars and summary of a monitor looks like.

### Status Bar

#### Partial

The status bar will be a gradient from green to red/yellow based on the status of the monitor.

![Trigger API](/documentation/x1.png)

#### Full

The status bar will be a solid color based on the status of the monitor.

![Trigger API](/documentation/x2.png)

---

### Roundness

Adjust the roundness of the status bar.

#### SHARP

![Trigger API](/documentation/x4.png)

#### ROUNDED

![Trigger API](/documentation/x3.png)

---

### Summary Type

Control how the summary of the monitor looks like.

#### Current

Shows the current live value of the monitor. Example: If it is DOWN currently it will say `DOWN for x minutes`, if it is UP it will say `Status Ok`

#### DAY

Shows the day's impact. Example: If it was down at 10:00 AM and it is 11:00 AM, it will say `DOWN for 1 hour`. If there was no DOWN or DEGRADED state it will say `Status Ok`

---

## Colors

You can change the colors of UP/DEGRADED/DOWN states of the monitor. You show have a shade of green, yellow, and red respectively.

---

## Font

You can change the font of the status page. You can choose from a list of google, or [bunny fonts](https://fonts.bunny.net/) (which is a fully GDPR-compliant, zero-tracking/no-logging CDN font service).

### Font URL

Add font url

### Font Family

Add font family name

### Custom CSS

You can add custom CSS to your status page. This will be added to the head of the page. You can add custom CSS to your status page. This will be added to the head of the page.

```css
.my-class {
    color: red;
}
```

<div class="note danger">
	Do not include &#x3C;style&#x3E; tags.
</div>
