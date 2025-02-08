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
		<td colspan="2" style="color:#A81D33;">
			<span style="display:inline-block;width:1.2rem;height:1.2rem;margin-top:-2px;margin-right:2px;vertical-align:middle;"><svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Debian</title><path d="M13.88 12.685c-.4 0 .08.2.601.28.14-.1.27-.22.39-.33a3.001 3.001 0 01-.99.05m2.14-.53c.23-.33.4-.69.47-1.06-.06.27-.2.5-.33.73-.75.47-.07-.27 0-.56-.8 1.01-.11.6-.14.89m.781-2.05c.05-.721-.14-.501-.2-.221.07.04.13.5.2.22M12.38.31c.2.04.45.07.42.12.23-.05.28-.1-.43-.12m.43.12l-.15.03.14-.01V.43m6.633 9.944c.02.64-.2.95-.38 1.5l-.35.181c-.28.54.03.35-.17.78-.44.39-1.34 1.22-1.62 1.301-.201 0 .14-.25.19-.34-.591.4-.481.6-1.371.85l-.03-.06c-2.221 1.04-5.303-1.02-5.253-3.842-.03.17-.07.13-.12.2a3.551 3.552 0 012.001-3.501 3.361 3.362 0 013.732.48 3.341 3.342 0 00-2.721-1.3c-1.18.01-2.281.76-2.651 1.57-.6.38-.67 1.47-.93 1.661-.361 2.601.66 3.722 2.38 5.042.27.19.08.21.12.35a4.702 4.702 0 01-1.53-1.16c.23.33.47.66.8.91-.55-.18-1.27-1.3-1.48-1.35.93 1.66 3.78 2.921 5.261 2.3a6.203 6.203 0 01-2.33-.28c-.33-.16-.77-.51-.7-.57a5.802 5.803 0 005.902-.84c.44-.35.93-.94 1.07-.95-.2.32.04.16-.12.44.44-.72-.2-.3.46-1.24l.24.33c-.09-.6.74-1.321.66-2.262.19-.3.2.3 0 .97.29-.74.08-.85.15-1.46.08.2.18.42.23.63-.18-.7.2-1.2.28-1.6-.09-.05-.28.3-.32-.53 0-.37.1-.2.14-.28-.08-.05-.26-.32-.38-.861.08-.13.22.33.34.34-.08-.42-.2-.75-.2-1.08-.34-.68-.12.1-.4-.3-.34-1.091.3-.25.34-.74.54.77.84 1.96.981 2.46-.1-.6-.28-1.2-.49-1.76.16.07-.26-1.241.21-.37A7.823 7.824 0 0017.702 1.6c.18.17.42.39.33.42-.75-.45-.62-.48-.73-.67-.61-.25-.65.02-1.06 0C15.082.73 14.862.8 13.8.4l.05.23c-.77-.25-.9.1-1.73 0-.05-.04.27-.14.53-.18-.741.1-.701-.14-1.431.03.17-.13.36-.21.55-.32-.6.04-1.44.35-1.18.07C9.6.68 7.847 1.3 6.867 2.22L6.838 2c-.45.54-1.96 1.611-2.08 2.311l-.131.03c-.23.4-.38.85-.57 1.261-.3.52-.45.2-.4.28-.6 1.22-.9 2.251-1.16 3.102.18.27 0 1.65.07 2.76-.3 5.463 3.84 10.776 8.363 12.006.67.23 1.65.23 2.49.25-.99-.28-1.12-.15-2.08-.49-.7-.32-.85-.7-1.34-1.13l.2.35c-.971-.34-.57-.42-1.361-.67l.21-.27c-.31-.03-.83-.53-.97-.81l-.34.01c-.41-.501-.63-.871-.61-1.161l-.111.2c-.13-.21-1.52-1.901-.8-1.511-.13-.12-.31-.2-.5-.55l.14-.17c-.35-.44-.64-1.02-.62-1.2.2.24.32.3.45.33-.88-2.172-.93-.12-1.601-2.202l.15-.02c-.1-.16-.18-.34-.26-.51l.06-.6c-.63-.74-.18-3.102-.09-4.402.07-.54.53-1.1.88-1.981l-.21-.04c.4-.71 2.341-2.872 3.241-2.761.43-.55-.09 0-.18-.14.96-.991 1.26-.7 1.901-.88.7-.401-.6.16-.27-.151 1.2-.3.85-.7 2.421-.85.16.1-.39.14-.52.26 1-.49 3.151-.37 4.562.27 1.63.77 3.461 3.011 3.531 5.132l.08.02c-.04.85.13 1.821-.17 2.711l.2-.42M9.54 13.236l-.05.28c.26.35.47.73.8 1.01-.24-.47-.42-.66-.75-1.3m.62-.02c-.14-.15-.22-.34-.31-.52.08.32.26.6.43.88l-.12-.36m10.945-2.382l-.07.15c-.1.76-.34 1.511-.69 2.212.4-.73.65-1.541.75-2.362M12.45.12c.27-.1.66-.05.95-.12-.37.03-.74.05-1.1.1l.15.02M3.006 5.142c.07.57-.43.8.11.42.3-.66-.11-.18-.1-.42m-.64 2.661c.12-.39.15-.62.2-.84-.35.44-.17.53-.2.83" fill="#A81D33"/></svg></span>
			Debian 12 <small>(Bookwork Slim)</small> w/ Node.js v23.7.0 &nbsp;<strong><em>(default)</em></strong>
		</td>
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
		<td colspan="2" style="color:#0D597F;">
			<span style="display:inline-block;width:1.2rem;height:1.2rem;margin-top:-2px;margin-right:2px;vertical-align:middle;"><svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Alpine Linux</title><path d="M5.998 1.607L0 12l5.998 10.393h12.004L24 12 18.002 1.607H5.998zM9.965 7.12L12.66 9.9l1.598 1.595.002-.002 2.41 2.363c-.2.14-.386.252-.563.344a3.756 3.756 0 01-.496.217 2.702 2.702 0 01-.425.111c-.131.023-.25.034-.358.034-.13 0-.242-.014-.338-.034a1.317 1.317 0 01-.24-.072.95.95 0 01-.2-.113l-1.062-1.092-3.039-3.041-1.1 1.053-3.07 3.072a.974.974 0 01-.2.111 1.274 1.274 0 01-.237.073c-.096.02-.209.033-.338.033-.108 0-.227-.009-.358-.031a2.7 2.7 0 01-.425-.114 3.748 3.748 0 01-.496-.217 5.228 5.228 0 01-.563-.343l6.803-6.727zm4.72.785l4.579 4.598 1.382 1.353a5.24 5.24 0 01-.564.344 3.73 3.73 0 01-.494.217 2.697 2.697 0 01-.426.111c-.13.023-.251.034-.36.034-.129 0-.241-.014-.337-.034a1.285 1.285 0 01-.385-.146c-.033-.02-.05-.036-.053-.04l-1.232-1.218-2.111-2.111-.334.334L12.79 9.8l1.896-1.897zm-5.966 4.12v2.529a2.128 2.128 0 01-.356-.035 2.765 2.765 0 01-.422-.116 3.708 3.708 0 01-.488-.214 5.217 5.217 0 01-.555-.34l1.82-1.825Z" fill="#0D597F"/></svg></span>
			Alpine Linux 3.21 w/ Node.js v23.7.0 &nbsp;<strong><em>(smallest image size)</em></strong>
		</td>
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
