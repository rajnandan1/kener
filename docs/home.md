---
title: Kener - A Sveltekit NodeJS Status Page System
description: Kener is an open-source Node.js status page tool, designed to make service monitoring and incident handling a breeze. It offers a sleek and user-friendly interface that simplifies tracking service outages and improves how we communicate during incidents.
---

# Kener - A Sveltekit NodeJS Status Page System

<p align="center">
	<img src="/newbg.png" width="100%" height="auto" class="rounded-lg shadow-lg" alt="kener example illustration">
</p>

<p class="flex space-x-2 justify-center">
	<a href="https://github.com/rajnandan1/kener/stargazers"  >
		<img alt="GitHub Repo stars"   src="https://img.shields.io/github/stars/rajnandan1/kener?label=Star%20Repo&
		style=social">
	</a>
	<a href="https://github.com/ivbeg/awesome-status-pages"  >
		<img src="https://cdn.rawgit.com/sindresorhus/awesome/d7305f38d29fed78fa85652e3a63e154dd8e8829/media/badge.svg" alt="Awesome status page" />
	</a>
	<a href="https://hub.docker.com/r/rajnandan1/kener"  >
		<img src="https://img.shields.io/docker/pulls/rajnandan1/kener" alt="Docker Kener" />
	</a>
</p>
<div class="flex gap-4 justify-center">
	<picture>
		<source srcset="https://fonts.gstatic.com/s/e/notoemoji/latest/1f38a/512.webp" type="image/webp">
		<img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f38a/512.gif" alt="🎊" width="32" height="32">
	</picture>
	<picture>
		<source srcset="https://fonts.gstatic.com/s/e/notoemoji/latest/1f514/512.webp" type="image/webp">
		<img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f514/512.gif" alt="🔔" width="32" height="32">
	</picture>
	<picture>
  		<source srcset="https://fonts.gstatic.com/s/e/notoemoji/latest/2049_fe0f/512.webp" type="image/webp">
  		<img src="https://fonts.gstatic.com/s/e/notoemoji/latest/2049_fe0f/512.gif" alt="⁉" width="32" height="32">
	</picture>
</div>
<div class="flex gap-2 kener-home-links">
	<div class="flex-1 border rounded-md py-4 px-2 text-center">
		<a href="https://kener.ing">Live Demo</a>
	</div>
	<div class="flex-1 border rounded-md  py-4 px-2 text-center">
		<a href="https://kener.ing/docs/quick-start">Quick Start</a>
	</div>
	<div class="flex-1 border rounded-md  py-4 px-2 text-center">
		<a href="https://kener.ing/docs/quick-start">Clone</a>
	</div>
	<div class="flex-1 border rounded-md  py-4 px-2 text-center">
		<a href="https://kener.ing/docs/deployment">Deploy</a>
	</div>
	<div class="flex-1 border rounded-md  py-4 px-2 text-center">
		<a href="https://kener.ing/docs/kener-apis">APIs</a>
	</div>
</div>

## What is Kener?

Kener is an advanced open-source status page tool that serves as a comprehensive network monitoring solution and enterprise network monitoring tool. Designed to streamline application performance monitoring, it offers a robust observability solution for teams looking to simplify service monitoring and incident handling. Unlike traditional monitoring tools, Kener provides a sleek and user-friendly interface that makes tracking service outages and managing network performance intuitive.

As a sophisticated net monitoring software, Kener integrates seamlessly with GitHub, transforming incident management into a collaborative team effort. While solutions like Datadog focus on complex enterprise network monitoring tools, Kener offers a lightweight, accessible alternative for teams of all sizes seeking powerful server monitoring software.

Kener name is derived from the word "Kene" which means "how is it going" in Assamese, then .ing because it was a cheaply available domain.

## Features

### Monitoring and Tracking

-   Advanced application performance monitoring tools
-   Real-time network monitor software capabilities
-   Polls HTTP endpoint or Push data to monitor using Rest APIs
-   Handles Timezones for visitors
-   Categorize Monitors into different Sections
-   Cron-based scheduling for monitors. Minimum per minute
-   Flexible monitor configuration using YAML
-   Construct complex API Polls - Chain, Secrets etc
-   Supports a Default Status for Monitors
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

Kener draws inspiration from a comprehensive ecosystem of monitoring and status page solutions, reflecting the diverse landscape of network and application performance tools:
Uptime and Status Page Platforms

-   Upptime - GitHub-powered uptime monitoring
-   Statuspage - Incident communication platform
-   Cachet - Open-source status page system
-   Upptrends - Global website monitoring
-   Hexometer - Website monitoring and performance tracking

Enterprise Monitoring Solutions

-   Pingdom - Website monitoring service
-   New Relic - Application performance monitoring
-   Datadog - Observability and monitoring platform
-   AppDynamics - Application performance management
-   Dynatrace - AI-powered full stack monitoring

Network and Infrastructure Monitoring

-   StatusCake - Uptime and performance monitoring
-   UptimeRobot - Free website monitoring
-   Better Uptime - Monitoring and incident management
-   Site24x7 - Comprehensive monitoring solution
-   Nagios - Infrastructure and network monitoring
-   Zabbix - Enterprise-class monitoring solution
-   Prometheus - Monitoring and alerting toolkit
-   Sentry - Error tracking and performance monitoring

Cloud and Hybrid Monitoring Platforms

-   CloudWatch - AWS monitoring service
-   Azure Monitor - Microsoft's monitoring solution
-   Google Cloud Monitoring - Cloud-native monitoring

## Support Me

If you are using Kener and want to support me, you can do so by sponsoring me on GitHub or buying me a coffee.

[Sponsor Me Using Github](https://github.com/sponsors/rajnandan1)

[Buy Me a Coffee](https://www.buymeacoffee.com/rajnandan1)
