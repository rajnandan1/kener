---
title: Status Badges | Kener
description: Status badges for your monitors
---

# Status Badges

There are three types of badges

Syntax

```md
http://[hostname]/badge/[tag]/status
http://[hostname]/badge/[tag]/dot
http://[hostname]/badge/[tag]/uptime
```

---

## Status

Shows the last health check was UP/DOWN/DEGRADED

![Earth Status](https://kener.ing/badge/earth/status)

Example in HTML

```html
<img src="https://kener.ing/badge/earth/status" />
```

Example in MarkDown

```md
![Status Badge](https://kener.ing/badge/[monitor.tag]/status)
```

### Custom Label

You can set custom label for the status badge. If you do not set a label it will default to the monitor name.

![Earth Status](https://kener.ing/badge/earth/status?label=Gotcha)

```md
![Earth Status](https://kener.ing/badge/earth/status?label=Gotcha)
```

---

## Live

Shows the last health check was UP/DOWN/DEGRADED as SVG dot

```bash
http://[hostname]/badge/[tag]/dot
#or
http://[hostname]/badge/[tag]/dot?animate=ping
```

### Standard

![Earth Status](/badge/earth/dot)

```html
<img src="https://kener.ing/badge/earth/dot" />
```

### Animated

![Earth Status](/badge/earth/dot?animate=ping)

```html
<img src="https://kener.ing/badge/earth/dot?animate=ping" />
```

---

## Uptime

Shows the 90 Day uptime by default. You can `sinceLast` as query param to get uptime since last x seconds.

![Earth Uptime](https://kener.ing/badge/earth/uptime)

### 90 Day Uptime

Example in HTML

```html
<img src="https://kener.ing/badge/earth/uptime" />
```

Example in MarkDown

```md
![Uptime Badge](https://kener.ing/badge/[monitor.tag]/uptime)
```

### 15 Minute Uptime

Set `sinceLast` as query param to get uptime since last x seconds.

Example in HTML

```html
<img src="https://kener.ing/badge/earth/uptime?sinceLast=900" />
```

Example in MarkDown

```md
![Uptime Badge](https://kener.ing/badge/[monitor.tag]/uptime?sinceLast=900)
```

### Custom Label

You can set custom label for the uptime badge. If you do not set a label it will default to the **monitor name**.

![Earth Uptime](https://kener.ing/badge/earth/uptime?label=Gotcha)

```md
![Earth Uptime](https://kener.ing/badge/earth/uptime?label=Gotcha)
```

### Hide Duration

You can hide the duration by setting `hideDuration=true`

![Earth Uptime](https://kener.ing/badge/earth/uptime?hideDuration=true)

```md
![Earth Uptime](https://kener.ing/badge/earth/uptime?hideDuration=true)
```

---

## Customize Badges

You can set different colors for badges and style. It only works for `status` and `uptime` badges.

### With Custom Label Color

![Earth Status](https://kener.ing/badge/earth/status?labelColor=F2BED1)

```md
![Earth Status](https://kener.ing/badge/earth/status?labelColor=F2BED1)
```

### With Custom Value Color

![Earth Status](https://kener.ing/badge/earth/status?color=FFC0D9)

```md
![Earth Status](https://kener.ing/badge/earth/status?color=FFC0D9)
```

### With Both Different Colors

![Earth Status](https://kener.ing/badge/earth/uptime?color=D0BFFF&labelColor=FFF3DA)

```md
![Earth Status](https://kener.ing/badge/earth/uptime?color=D0BFFF&labelColor=FFF3DA)
```

### Style Of the Badge

You can change the style of the badge. Supported Styles are `plastic`, `flat`, `flat-square`, `for-the-badge` or `social`. Default is `flat`

#### plastic

![Earth Uptime](https://kener.ing/badge/earth/uptime?style=plastic)

```md
![Earth Uptime](https://kener.ing/badge/earth/uptime?style=plastic)
```

#### flat

![Earth Uptime](https://kener.ing/badge/earth/uptime?style=flat)

```md
![Earth Uptime](https://kener.ing/badge/earth/uptime?style=flat)
```

#### flat-square

![Earth Uptime](https://kener.ing/badge/earth/uptime?style=flat-square)

```md
![Earth Uptime](https://kener.ing/badge/earth/uptime?style=flat-square)
```

#### for-the-badge

![Earth Uptime](https://kener.ing/badge/earth/uptime?style=for-the-badge)

```md
![Earth Uptime](https://kener.ing/badge/earth/uptime?style=for-the-badge)
```

#### social

![Earth Uptime](https://kener.ing/badge/earth/uptime?style=social)

```md
![Earth Uptime](https://kener.ing/badge/earth/uptime?style=social)
```
