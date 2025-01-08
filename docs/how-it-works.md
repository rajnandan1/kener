---
title: How it works | Kener
description: Folder structure and how Kener works
---

# How it works

Kener has two parts.

-   Sveltekit application which is server rendered and is the frontend. It is running on Svelte 4.
-   Hooks into the backend to get the data for your monitors

## Folder structure

```shell
├── src (svelte frontend files)
├── static (things put here can be referenced directly example static/logo.png -> /logo.png)
├── src
├──── routes
├────── (docs) (You can delete this, this has routes for documentation)
├──── lib
├────── server
├──────── config (Location for you site.yaml and monitos.yaml)
├──────── data (This is the location where server computate data is stored. Do not touch this)
├── docs (Documentation, you can delete this folder)
```

## Site.yaml

This is the configuration file for your site. This is where you define the name of your site, the look and feel of your site etc. Read more about it [here](/docs/customize-site)

## Monitors.yaml

This is the configuration file for your monitors. This is where you define the monitors you want to show on your site. Read more about it [here](/docs/monitors)

## Data

Kener stores its data in a folder which is `./database`. This is where all the data is stored. You can delete this folder if you want to start fresh.
