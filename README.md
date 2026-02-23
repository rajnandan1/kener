# Kener - Stunning Status Pages

<details>
  <summary>Upcoming Version 4.0.0</summary>
   Currently we are working on updating kener to the latest svelte version with typescript
</details>

<p align="center">
	<img src="https://kener.ing/og.jpg?v=1" width="100%" height="auto" class="rounded-lg shadow-lg" alt="kener example illustration">
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

## Quick Start

Get Kener running in minutes.

### Docker (recommended)

```bash
git clone https://github.com/rajnandan1/kener.git
cd kener

# Uses docker-compose.yml (includes Redis + Kener)
# Set a strong KENER_SECRET_KEY and ORIGIN in docker-compose.yml before first run
docker compose up -d
```

Open `http://localhost:3000`.

> [!IMPORTANT]
> Set a strong `KENER_SECRET_KEY` and set `ORIGIN` to your public URL before starting for the first time.

Use `docker-compose.dev.yml` when you want to build from local source instead of pulling the published image:

```bash
docker compose -f docker-compose.dev.yml up -d --build
```

Or combine both files to keep base production config while overriding Kener with a local build:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

### Run pre-built image

You can use either image:

- `docker.io/rajnandan1/kener:latest`
- `ghcr.io/rajnandan1/kener:latest`

```bash
mkdir -p database
docker run -d \
	--name kener \
	-p 3000:3000 \
	-v "$(pwd)/database:/app/database" \
	-e "KENER_SECRET_KEY=replace_with_a_random_string" \
	-e "ORIGIN=http://localhost:3000" \
	-e "REDIS_URL=redis://host.docker.internal:6379" \
	docker.io/rajnandan1/kener:latest
```

### Run without Docker

Requirements:

- Node.js `>= 20`
- Redis

```bash
git clone https://github.com/rajnandan1/kener.git
cd kener
npm install

# Start Redis (example)
docker run -d --name kener-redis -p 6379:6379 redis:7-alpine

npm run build
npm run start
```

Create a `.env` with at least:

```dotenv
KENER_SECRET_KEY=replace_with_a_random_string
ORIGIN=http://localhost:3000
REDIS_URL=redis://localhost:6379
PORT=3000
```

For the full quick start (including local Docker builds and dev mode), see the docs:

- https://kener.ing/docs/quick-start

## One Click Deployment

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/template/spSvic?referralCode=1Pn7vs)

## Features

Kener combines public status page essentials with advanced admin workflows.

### 📊 &nbsp;Monitoring, Reliability, and Communication

- Monitor **API, Ping, TCP, DNS, SSL, SQL, Heartbeat, and GameDig** checks
- Manage incidents with clear timelines, updates, and acknowledgements
- Schedule maintenance windows and keep users informed throughout
- Send notifications via **Email, Webhook, Slack, and Discord**
- Explore historical monitoring data and uptime trends

### 🎨 &nbsp;Status Page Experience and Branding

- Build branded, customizable status pages (logo, colors, CSS, themes)
- Support **light/dark mode**, localization, and timezone-aware display
- Embed status widgets and badges into external sites and portals
- Provide SEO-friendly public pages for global audiences

### 🛠️ &nbsp;Operations, Collaboration, and Automation

- Invite teams with role-based collaboration across workflows
- Manage multiple status pages from one Kener instance
- Use trigger-based workflows and template-driven messaging
- Manage API keys for secure integrations and automations
- Integrate analytics providers like GA, Plausible, Mixpanel, Umami, and Clarity
- Access the full REST API for incidents, monitors, and reporting

<div align="left">
    <img alt="Visitor Stats" src="https://widgetbite.com/stats/rajnandan"/>
</div>

## Technologies Used

- [SvelteKit](https://kit.svelte.dev/)
- [shadcn-svelte](https://www.shadcn-svelte.com/)

## Support Me

If you’re enjoying Kener and want to support its development, consider sponsoring me on GitHub or treating me to a coffee. Your support helps keep the project growing! 🚀

[Sponsor Me Using Github](https://github.com/sponsors/rajnandan1)

☕ &nbsp;[Buy Me a Coffee](https://www.buymeacoffee.com/rajnandan1)

![image](https://badges.pufler.dev/visits/rajnandan1/kener)

## Contributing

If you want to contribute to Kener, please read the [Contribution Guide](https://github.com/rajnandan1/kener/blob/main/.github/CONTRIBUTING.md).

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=rajnandan1/kener&type=Date)](https://star-history.com/#rajnandan1/kener&Date)
