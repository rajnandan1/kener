---
title: Kener Deployment - From Source or Docker
description: Kener can be deployed in multiple ways. You can use the pre-built docker image or build from source.
---

# Deployment

Kener can be deployed in multiple ways. You can use the pre-built docker image or build from source.

## Prerequisites

Make sure you have the following installed:

-   [Node.js](https://nodejs.org/en/download/)
-   [npm](https://www.npmjs.com/get-npm)
-   Make sure `./database` and `./config` directories are present in the root directory
-   [config/site.yaml](/docs/customize-site) Contains information about the site
-   [config/monitors.yaml](/docs/monitors) Contains your monitors and their related specifications
-   [Set up Environment Variables](/docs/environment-vars). You can use a `.env` file or pass them as arguments. Be sure to add `NODE_ENV=production` for production deployment

## NPM

```shell
npm i
npm run build
npm run prod
```

## PM2

```shell
npm i
node build.js
pm2 start src/lib/server/startup.js
pm2 start main.js
```

## Docker

[Dockerhub](https://hub.docker.com/r/rajnandan1/kener)

```shell
docker.io/rajnandan1/kener:latest
```

[Github Packages](https://github.com/rajnandan1/kener/pkgs/container/kener)

```shell
ghcr.io/rajnandan1/kener:latest
```

You should mount two host directories to persist your configuration and database. [Environmental variables](https://rajnandan1.github.io/kener-docs/docs/environment-vars) can be passed with `-e` An example `docker run` command:

Make sure `./database` and `./config` directories are present in the root directory

```shell
mkdir database
mkdir config
curl -o config/site.yaml https://raw.githubusercontent.com/rajnandan1/kener/refs/heads/main/config/site.example.yaml
curl -o config/monitors.yaml https://raw.githubusercontent.com/rajnandan1/kener/refs/heads/main/config/monitors.example.yaml
docker run \
  -v $(pwd)/database:/app/database \
  -v $(pwd)/config:/app/config \
  -p 3000:3000 \
  -e "GH_TOKEN=1234" \
  rajnandan1/kener
```

You can also use a .env file

```shell
docker run \
  -v $(pwd)/database:/app/database \
  -v $(pwd)/config:/app/config \
  --env-file .env \
  -p 3000:3000 \
  rajnandan1/kener
```

Or use **Docker Compose** with the example [docker-compose.yaml](https://raw.githubusercontent.com/rajnandan1/kener/main/docker-compose.yml)

## Using PUID and PGID

If you are

-   running on a **linux host** (ie unraid) and
-   **not** using [rootless containers with Podman](https://developers.redhat.com/blog/2020/09/25/rootless-containers-with-podman-the-basics#why_podman_)

then you must set the [environmental variables **PUID** and **PGID**.](https://docs.linuxserver.io/general/understanding-puid-and-pgid) in the container in order for it to generate files/folders your normal user can interact it.

Run these commands from your terminal

-   `id -u` -- prints UID for **PUID**
-   `id -g` -- prints GID for **PGID**

Then add to your docker command like so:

```shell
docker run -d ... -e "PUID=1000" -e "PGID=1000" ... rajnandan1/kener
```

or substitute them in [docker-compose.yml](https://raw.githubusercontent.com/rajnandan1/kener/main/docker-compose.yml)

## Base path

By default kener runs on `/` but you can change it to `/status` or any other path. Read more about it [here](/docs/environment-vars/#kener-base-path)
