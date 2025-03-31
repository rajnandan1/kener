# Kener - Stunning Status Pages

<p align="center">
	<img src="https://kener.ing/newbg.png?v=1" width="100%" height="auto" class="rounded-lg shadow-lg" alt="kener example illustration">
</p>

<p align="center">
	<img alt="GitHub Repo stars" src="https://img.shields.io/github/stars/rajnandan1/kener?label=Star%20Repo&style=social">
	<a href="https://github.com/ivbeg/awesome-status-pages"><img src="https://cdn.rawgit.com/sindresorhus/awesome/d7305f38d29fed78fa85652e3a63e154dd8e8829/media/badge.svg" alt="Awesome status page" /></a>
    <a href="https://awesome-selfhosted.net/tags/status--uptime-pages.html#kener"><img src="https://awesome.re/mentioned-badge.svg" alt="Awesome self hosted" /></a>
</p>

<p align="center">
  <a href="https://hub.docker.com/r/rajnandan1/kener"><img src="https://img.shields.io/docker/pulls/rajnandan1/kener" alt="Docker Kener" /></a>
  <a href="https://hub.docker.com/r/rajnandan1/kener/tags?page=1&ordering=last_updated&name=latest"><img alt="Docker Image Size" src="https://img.shields.io/docker/image-size/rajnandan1/kener/latest?logo=docker&logoColor=white&label=debian" /></a>
  <a href="https://hub.docker.com/r/rajnandan1/kener/tags?page=1&ordering=last_updated&name=alpine"><img alt="Docker Image Size" src="https://img.shields.io/docker/image-size/rajnandan1/kener/alpine?logo=docker&logoColor=white&label=alpine" /></a>
</p>

<p align="center">
  <a href="https://github.com/rajnandan1/kener/actions/workflows/publish-images.yml"><img alt="GitHub Workflow Status" src="https://img.shields.io/github/actions/workflow/status/rajnandan1/kener/publish-images.yml" /></a>
  <a href="https://github.com/rajnandan1/kener/commit/HEAD"><img src="https://img.shields.io/github/last-commit/rajnandan1/kener/main" alt="" /></a>
  <a href="https://github.com/rajnandan1/kener/issues"><img alt="GitHub issues" src="https://img.shields.io/github/issues/rajnandan1/kener.svg" /></a>
</p>

<p align="center">
	<a href="https://www.producthunt.com/posts/kener-2" target="_blank">
		<img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=kener-2&theme=light" alt="Kener on Product Hunt">
	</a>
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

**Kener** is a sleek and lightweight status page system built with **SvelteKit** and **NodeJS**. It’s not here to replace heavyweights like Datadog or Atlassian but rather to offer a simple, modern, and hassle-free way to set up a great-looking status page with minimal effort.

Designed with **ease of use** and **customization in mind**, Kener provides all the essential features you’d expect from a status page—without unnecessary complexity.

### Why Kener?

✅ &nbsp;Minimal overhead &ndash; Set up quickly with a clean, modern UI<br>
✅ &nbsp;Customizable &ndash; Easily tailor it to match your brand<br>
✅ &nbsp;Open-source & free &ndash; Because great tools should be accessible to everyone

### What's in a Name?

“Kener” is inspired by the Assamese word _“Kene”_, meaning _“how’s it going?”_. The _‘.ing’_ was added because, well… that domain was available. 😄

## Installation

### Manual

```shell
# Clone the repository
git clone https://github.com/rajnandan1/kener.git
cd kener
npm install
cp .env.example .env
npm run dev
```

### Docker

Official Docker images for **Kener** are available on [Docker Hub](https://hub.docker.com/r/rajnandan1/kener). Multiple versions are maintained to support different use cases.

<a href="https://hub.docker.com/r/rajnandan1/kener/tags?page=1&ordering=last_updated&name=3.2.12"><img src="https://img.shields.io/badge/Latest_Stable_Release-3.2.12-blue" alt="Kener latest stable version: 3.2.12" /></a>

#### Available Tags

<table>
	<tr>
		<th>Image Tag</th>
		<th>Description</th>
	</tr>
	<tr>
		<td align="left" colspan="2" style="color:#A81D33;text-align:left;">Debian 12 <small>(Bookwork Slim)</small> w/ Node.js v23.7.0 &nbsp;<strong><em>(default)</em></strong></td>
	</tr>
	<tr>
		<td><a href="https://hub.docker.com/r/rajnandan1/kener/tags?page=1&ordering=last_updated&name=latest" target="_blank"><code>latest</code></td>
		<td>Latest stable release (aka 3.2.12)</td>
	</tr>
	<tr>
		<td><a href="https://hub.docker.com/r/rajnandan1/kener/tags?page=1&ordering=last_updated&name=3.2.12" target="_blank"><code>3.2.12</code></a></td>
		<td>Specific release version</td>
	</tr>
	<tr>
		<td><a href="https://hub.docker.com/r/rajnandan1/kener/tags?page=1&ordering=last_updated&name=3.2" target="_blank"><code>3.2</code></a></td>
		<td>Major-minor version tag pointing to the latest patch (3.2.12) release within that minor version (3.2.x)</td>
	</tr>
	<tr>
		<td><a href="https://hub.docker.com/r/rajnandan1/kener/tags?page=1&ordering=last_updated&name=3" target="_blank"><code>3</code></a></td>
		<td>Major version tag pointing to the latest stable (3.2.12) release within that major version (3.x.x)</td>
	</tr>
	<tr>
		<td align="left" colspan="2" style="color:#0D597F;text-align:left;">Alpine Linux 3.21 w/ Node.js v23.7.0 &nbsp;<strong><em>(smallest image size)</em></strong></td>
	</tr>
	<tr>
		<td><a href="https://hub.docker.com/r/rajnandan1/kener/tags?page=1&ordering=last_updated&name=alpine" target="_blank"><code>alpine</code></td>
		<td>Latest stable release (aka 3.2.12)</td>
	</tr>
	<tr>
		<td><a href="https://hub.docker.com/r/rajnandan1/kener/tags?page=1&ordering=last_updated&name=3.2.12-alpine" target="_blank"><code>3.2.12-alpine</code></a></td>
		<td>Specific release version</td>
	</tr>
	<tr>
		<td><a href="https://hub.docker.com/r/rajnandan1/kener/tags?page=1&ordering=last_updated&name=3.2-alpine" target="_blank"><code>3.2-alpine</code></a></td>
		<td>Major-minor version tag pointing to the latest patch (3.2.12) release within that minor version (3.2.x)</td>
	</tr>
	<tr>
		<td><a href="https://hub.docker.com/r/rajnandan1/kener/tags?page=1&ordering=last_updated&name=3-alpine" target="_blank"><code>3-alpine</code></a></td>
		<td>Major version tag pointing to the latest stable (3.2.12) release within that major version (3.x.x)</td>
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
This keeps things clean, structured, and easy to read while preserving all the details.

### One Click

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/template/spSvic?referralCode=1Pn7vs)

## Features

Here are some of the features that you get out of the box. Please read the documentation to know how to use them.

### 📊 &nbsp;Monitoring and Tracking

- Advanced **application performance monitoring** tools
- **Real-time network monitoring** capabilities
- Supports **polling HTTP endpoints** or **pushing data** via REST APIs
- **Timezone auto-adjustment** for visitors
- Organize monitors into **custom sections**
- **Cron-based scheduling** (minimum: **every minute**)
- **Create complex API polls** (chaining, secrets, etc.)
- Set a **default status** for monitors
- Supports **base path hosting in Kubernetes (k8s)**
- **Pre-built Docker images** for easy deployment

### 🎨 &nbsp;Customization and Branding

- Fully **customizable status page**
- **Badge generation** for status and uptime tracking
- Support for **custom domains**
- Embed monitors as **iframes or widgets**
- **Light & Dark Mode**
- **Internationalization (i18n) support**
- **Sleek, beautifully crafted UI**

### 🚨 &nbsp;Incident Management

- **Incident tracking & communication** tools
- **Comprehensive APIs** for incident management

### 🧑‍💻 &nbsp;User Experience and Design

- **Accessible & user-friendly interface**
- **Quick & easy installation**
- **Responsive design** for all devices
- **Auto SEO & Social Media ready**
- **Server-Side Rendering (SSR) for better performance**

<div align="left">
    <img alt="Visitor Stats" src="https://widgetbite.com/stats/rajnandan"/>
</div>

## Technologies Used

-   [SvelteKit](https://kit.svelte.dev/)
-   [shadcn-svelte](https://www.shadcn-svelte.com/)

## Support Me

If you’re enjoying Kener and want to support its development, consider sponsoring me on GitHub or treating me to a coffee. Your support helps keep the project growing! 🚀

[Sponsor Me Using Github](https://github.com/sponsors/rajnandan1)

☕ &nbsp;[Buy Me a Coffee](https://www.buymeacoffee.com/rajnandan1)

![image](https://badges.pufler.dev/visits/rajnandan1/kener)

## Contributing

If you want to contribute to Kener, please read the [Contribution Guide](https://github.com/rajnandan1/kener/blob/main/.github/CONTRIBUTING.md).

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=rajnandan1/kener&type=Date)](https://star-history.com/#rajnandan1/kener&Date)
