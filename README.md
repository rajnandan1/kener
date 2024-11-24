# Kener - A Sveltekit NodeJS Status Page System

<p align="center">
	<img src="https://kener.ing/newbg.png" width="100%" height="auto" class="rounded-lg shadow-lg" alt="kener example illustration">
</p>

<p align="center">
	<img alt="GitHub Repo stars" src="https://img.shields.io/github/stars/rajnandan1/kener?label=Star%20Repo&style=social">
	<a href="https://github.com/ivbeg/awesome-status-pages"><img src="https://cdn.rawgit.com/sindresorhus/awesome/d7305f38d29fed78fa85652e3a63e154dd8e8829/media/badge.svg" alt="Awesome status page" /></a>
	<a href="https://hub.docker.com/r/rajnandan1/kener"><img src="https://img.shields.io/docker/pulls/rajnandan1/kener" alt="Docker Kener" /></a>
	<img alt="GitHub Repo Updated" src="https://badges.pufler.dev/updated/rajnandan1/kener">
</p>
  
<p align="center">
	<picture>
  		<source srcset="https://fonts.gstatic.com/s/e/notoemoji/latest/1f514/512.webp" type="image/webp">
  		<img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f514/512.gif" alt="🔔" width="32" height="32">
	</picture>
	<picture>
  		<source srcset="https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.webp" type="image/webp">
  		<img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f680/512.gif" alt="🚀" width="32" height="32">
	</picture>
	<picture>
  		<source srcset="https://fonts.gstatic.com/s/e/notoemoji/latest/1f6a7/512.webp" type="image/webp">
 		<img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f6a7/512.gif" alt="🚧" width="32" height="32">
	</picture>
</p>


#### [👉 Visit a live server](https://kener.ing)

#### [👉 Quick Start](https://kener.ing/docs/quick-start)

#### [👉 Documentation](https://kener.ing/docs/home)

## What is Kener?

Kener: Open-source sveltekit status page tool, designed to make service monitoring and incident handling a breeze. It offers a sleek and user-friendly interface that simplifies tracking service outages and improves how we communicate during incidents. Kener integrates seamlessly with GitHub, making incident management a team effort—making.

It uses files to store the data.

Kener name is derived from the word "Kene" which means "how is it going" in Assamese, then .ing is added to make cooler.
<div align="left">
    <img alt="Visitor Stats" src="https://widgetbite.com/stats/rajnandan"/>  
</div>
    
## Features

Here are some of the features that you get out of the box. Please read the documentation to know how to use them.

### Monitoring and Tracking

-   Real-time monitoring
-   Polls HTTP endpoint or Push data to monitor using Rest APIs
-   Handles Timezones for visitors
-   Categorize Monitors into different Sections
-   Cron-based scheduling for monitors. Minimum per minute
-   Flexible monitor configuration using YAML. Define your own parsing for monitor being UP/DOWN/DEGRADED
-   Construct complex API Polls - Chain, Secrets etc
-   Supports a Default Status for Monitors. Example defaultStatus=DOWN if you don't hit API per minute with Status UP
-   Supports base path for hosting in k8s
-   Pre-built docker image for easy deployment

### Customization and Branding

-   Customizable status page using yaml or code
-   Badge generation for status and uptime of Monitors
-   Support for custom domains
-   Embed Monitor as an iframe or widget
-   Light + Dark Theme
-   Internationalization support

### Incident Management

-   Create Incidents using Github Issues - Rich Text
-   Or use APIs to create Incidents

### User Experience and Design

-   100% Accessibility Score
-   Easy installation and setup
-   User-friendly interface
-   Responsive design for various devices
-   Auto SEO and Social Media ready

## Technologies used

-   [SvelteKit](https://kit.svelte.dev/)
-   [shadcn-svelte](https://www.shadcn-svelte.com/)

## Inspired from

-   [Upptime](https://upptime.js.org/)

## Screenshots

![image](static/marken_90.png)
![image](static/marken_api.png)
![image](static/marken_badge.png)
![image](static/marken_embed.png)
![image](static/marken_inci.png)
![image](static/marken_share.png)
![image](static/marken_td.png)
![image](static/marken_tl.png)
![image](static/marken_theme.png)

## Support Me

If you are using Kener and want to support me, you can do so by sponsoring me on GitHub or buying me a coffee.

[Sponsor Me Using Github](https://github.com/sponsors/rajnandan1)

[Buy Me a Coffee](https://www.buymeacoffee.com/rajnandan1)

![image](https://badges.pufler.dev/visits/rajnandan1/kener)
