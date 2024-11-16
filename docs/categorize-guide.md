---
title: Categorize Monitors Guide | Kener
description: Categorize Monitors in Kener
---

# Categorize Monitors

Let us add a category to our monitors.

## Sample monitors.yaml

```yaml
- name: OkBookmarks
  description: A free bookmark manager that lets you save and search your bookmarks in the cloud.
  tag: "okbookmarks"
  image: "https://okbookmarks.com/assets/img/extension_icon128.png"
  api:
      method: GET
      url: https://okbookmarks.com
- name: Earth
  description: Our blue planet
  tag: "earth"
  defaultStatus: "UP"
  image: "/earth.png"
  category: "Hello"
- name: Frogment
  description: A free openAPI spec editor and linter that breaks down your spec into fragments to make editing easier and more intuitive. Visit https://www.frogment.com
  tag: "frogment"
  image: "/frogment.png"
  api:
      method: GET
      url: https://www.frogment.com
```

## Sample site.yaml

```yaml
#...
categories:
  - name: Hello
	description: Say Hello to the world
#...
```

The above will have OkBookmarks and Frogment under home. Earth will be under Hello category.
