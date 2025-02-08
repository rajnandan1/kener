# Kener - Stunning Status Pages

<p align="center">
	<img src="https://kener.ing/newbg.png?v=1" width="100%" height="auto" class="rounded-lg shadow-lg" alt="kener example illustration">
</p>

<p align="center">
	<img alt="GitHub Repo stars" src="https://img.shields.io/github/stars/rajnandan1/kener?label=Star%20Repo&style=social">
	<a href="https://github.com/ivbeg/awesome-status-pages"><img src="https://cdn.rawgit.com/sindresorhus/awesome/d7305f38d29fed78fa85652e3a63e154dd8e8829/media/badge.svg" alt="Awesome status page" /></a>
</p>

<p align="center">
  <a href="https://hub.docker.com/r/rajnandan1/kener"><img src="https://img.shields.io/docker/pulls/rajnandan1/kener" alt="Docker Kener" /></a>
  <a href="https://hub.docker.com/r/rajnandan1/kener"><img alt="Docker Image Size" src="https://img.shields.io/docker/image-size/rajnandan1/kener/latest?logo=docker&logoColor=white&label=debian" /></a>
  <a href="https://hub.docker.com/r/rajnandan1/kener"><img alt="Docker Image Size" src="https://img.shields.io/docker/image-size/rajnandan1/kener/alpine?logo=docker&logoColor=white&label=alpine" /></a>
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

| [🌍 Live Server](https://kener.ing) | [🎉 Quick Start](https://kener.ing/docs/quick-start) | [🗄 Documentation](https://kener.ing/docs/home) |
| ----------------------------------- | ---------------------------------------------------- | ----------------------------------------------- |

## What is Kener?

Kener is status page system built with Sveltekit and NodeJS. It does not try to replace the Datadogs and Atlassian of the world. It tries to help some who wants to come up with a status page that looks nice and minimum overhead, in a modern way.

It is carefully crafted to be easy to use and customize.

It comes with all the basic asks for a status page. It is open-source and free to use.

Kener name is derived from the word "Kene" which means "how is it going" in Assamese, then .ing because it was a cheaply available domain.

## Installation

### Manual

```shell
# Clone the repository
git clone https://github.com/rajnandan1/kener.git
cd kener
npm install
cp .env.example .env
npm run build
npm run dev
```

### Docker

Official Docker images for **Kener** are available on [Docker Hub](https://hub.docker.com/r/rajnandan1/kener). Multiple versions are maintained to support different use cases.

![Docker Image Version (latest semver)](https://img.shields.io/docker/v/rajnandan1/kener?sort=semver&label=Latest%20Stable%20Release)

#### Available Tags

<table>
	<tr>
		<th>Image Tag</th>
		<th>Description</th>
	</tr>
	<tr>
		<td align="left" colspan="2" style="color:#A81D33;">Debian 12 <small>(Bookwork Slim)</small> w/ Node.js v23.7.0 &nbsp;<strong><em>(default)</em></strong></td>
	</tr>
	<tr>
		<td><a href="https://hub.docker.com/r/rajnandan1/kener/tags?page=1&ordering=last_updated&name=latest" target="_blank"><code>latest</code></td>
		<td>Latest stable release (aka KENER_SEMVER_VERSION_PLACEHOLDER)</td>
	</tr>
	<tr>
		<td><a href="https://hub.docker.com/r/rajnandan1/kener/tags?page=1&ordering=last_updated&name=KENER_SEMVER_VERSION_PLACEHOLDER" target="_blank"><code>KENER_SEMVER_VERSION_PLACEHOLDER</code></a></td>
		<td>Specific release version</td>
	</tr>
	<tr>
		<td><a href="https://hub.docker.com/r/rajnandan1/kener/tags?page=1&ordering=last_updated&name=KENER_MAJOR_MINOR_VERSION_PLACEHOLDER" target="_blank"><code>KENER_MAJOR_MINOR_VERSION_PLACEHOLDER</code></a></td>
		<td>Major-minor version tag pointing to the latest patch (KENER_SEMVER_VERSION_PLACEHOLDER) release within that minor version (KENER_MAJOR_MINOR_VERSION_PLACEHOLDER.x)</td>
	</tr>
	<tr>
		<td><a href="https://hub.docker.com/r/rajnandan1/kener/tags?page=1&ordering=last_updated&name=KENER_MAJOR_VERSION_PLACEHOLDER" target="_blank"><code>KENER_MAJOR_VERSION_PLACEHOLDER</code></a></td>
		<td>Major version tag pointing to the latest stable (KENER_SEMVER_VERSION_PLACEHOLDER) release within that major version (KENER_MAJOR_VERSION_PLACEHOLDER.x.x)</td>
	</tr>
	<tr>
		<td align="left" colspan="2" style="color:#0D597F;">Alpine Linux 3.21 w/ Node.js v23.7.0 &nbsp;<strong><em>(smallest image size)</em></strong></td>
	</tr>
	<tr>
		<td><a href="https://hub.docker.com/r/rajnandan1/kener/tags?page=1&ordering=last_updated&name=alpine" target="_blank"><code>alpine</code></td>
		<td>Latest stable release (aka KENER_SEMVER_VERSION_PLACEHOLDER)</td>
	</tr>
	<tr>
		<td><a href="https://hub.docker.com/r/rajnandan1/kener/tags?page=1&ordering=last_updated&name=KENER_SEMVER_VERSION_PLACEHOLDER-alpine" target="_blank"><code>KENER_SEMVER_VERSION_PLACEHOLDER-alpine</code></a></td>
		<td>Specific release version</td>
	</tr>
	<tr>
		<td><a href="https://hub.docker.com/r/rajnandan1/kener/tags?page=1&ordering=last_updated&name=KENER_MAJOR_MINOR_VERSION_PLACEHOLDER-alpine" target="_blank"><code>KENER_MAJOR_MINOR_VERSION_PLACEHOLDER-alpine</code></a></td>
		<td>Major-minor version tag pointing to the latest patch (KENER_SEMVER_VERSION_PLACEHOLDER) release within that minor version (KENER_MAJOR_MINOR_VERSION_PLACEHOLDER.x)</td>
	</tr>
	<tr>
		<td><a href="https://hub.docker.com/r/rajnandan1/kener/tags?page=1&ordering=last_updated&name=KENER_MAJOR_VERSION_PLACEHOLDER-alpine" target="_blank"><code>KENER_MAJOR_VERSION_PLACEHOLDER-alpine</code></a></td>
		<td>Major version tag pointing to the latest stable (KENER_SEMVER_VERSION_PLACEHOLDER) release within that major version (KENER_MAJOR_VERSION_PLACEHOLDER.x.x)</td>
	</tr>
</table>

#### Usage

Pull the latest stable version:

```sh
docker pull rajnandan1/kener:latest
```

Or use the smaller, Alpine-based variant:

```sh
docker pull rajnandan1/kener:alpine
```

For a production setup, refer to the sample [docker-compose.yml](https://github.com/rajnandan1/kener/blob/main/docker-compose.yml).
This keeps things clean, structured, and easy to read while preserving all the details. Let me know if you want any refinements! 🚀

### One Click

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/template/spSvic?referralCode=1Pn7vs)

## Features

Here are some of the features that you get out of the box. Please read the documentation to know how to use them.

### Monitoring and Tracking

-   Advanced application performance monitoring tools
-   Real-time network monitor software capabilities
-   Polls HTTP endpoint or Push data to monitor using Rest APIs
-   Adjusts Timezones for visitors
-   Categorize Monitors into different Sections
-   Cron-based scheduling for monitors. Minimum per minute
-   Construct complex API Polls - Chain, Secrets etc
-   Supports a Default Status for Monitors
-   Supports base path for hosting in k8s
-   Pre-built docker image for easy deployment
-   Automatically adjusts timezones for visitors

### Customization and Branding

-   Customizable status page
-   Badge generation for status and uptime of Monitors
-   Support for custom domains
-   Embed Monitor as an iframe or widget
-   Light + Dark Theme
-   Internationalization support
-   Beautifully Crafted Status Page

### Incident Management

-   Incident Management
-   Incident Communication
-   Comprehensive APIs for Incident Management

### User Experience and Design

-   Good Accessibility Score
-   Easy installation and setup
-   User-friendly interface
-   Responsive design for various devices
-   Auto SEO and Social Media ready
-   Server Side Rendering


<div align="left">
    <img alt="Visitor Stats" src="https://widgetbite.com/stats/rajnandan"/>  
</div>


## Technologies used

-   [SvelteKit](https://kit.svelte.dev/)
-   [shadcn-svelte](https://www.shadcn-svelte.com/)

## Support Me

If you are using Kener and want to support me, you can do so by sponsoring me on GitHub or buying me a coffee.

[Sponsor Me Using Github](https://github.com/sponsors/rajnandan1)

[Buy Me a Coffee](https://www.buymeacoffee.com/rajnandan1)

![image](https://badges.pufler.dev/visits/rajnandan1/kener)

## Contributing

If you want to contribute to Kener, please read the [Contributing Guide](https://github.com/rajnandan1/kener/blob/main/.github/CONTRIBUTING.md).

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=rajnandan1/kener&type=Date)](https://star-history.com/#rajnandan1/kener&Date)
