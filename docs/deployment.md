---
title: Kener Deployment - From Source or Docker
description: Kener can be deployed in multiple ways. You can use the pre-built docker image or build from source.
---

# Deployment

Kener can be deployed in multiple ways. You can use the pre-built docker image or build from source.

## Prerequisites

Make sure you have the following installed:

-   [Node.js 20 or above](https://nodejs.org/en/download/)
-   [npm](https://www.npmjs.com/get-npm)
-   [Sqlite3](https://www.sqlite.org/download.html)
-   Make sure `./database` directory is present in the root directory
-   [Set up Environment Variables](/docs/environment-vars). You can use a `.env` file or pass them as arguments. Be sure to add `NODE_ENV=production` for production deployment

## NPM

```bash
npm i
npm run build #build the frontend
npm run start
```

## PM2

```bash
npm i
npm run build #build the frontend
pm2 start main.js
```

## Docker

[Dockerhub](https://hub.docker.com/r/rajnandan1/kener)

```bash
docker.io/rajnandan1/kener:latest
```

[Github Packages](https://github.com/rajnandan1/kener/pkgs/container/kener)

```bash
ghcr.io/rajnandan1/kener:latest
```

You should mount two host directories to persist your configuration and database. [Environmental variables](/docs/environment-vars) can be passed with `-e` An example `docker run` command:

Make sure `./database` directory is present in the root directory

```bash
mkdir database
docker run \
  -v $(pwd)/database:/app/database \
  -p 3000:3000 \
  -e "KENER_SECRET_KEY=somesecretkey" \
  -e "ORIGIN=http://localhost:3000" \
  -e "GH_TOKEN=ghp_gJ6dhpVa7asdgsarandomtoken" \
  rajnandan1/kener
```

You can also use a .env file

```bash
docker run \
  -v $(pwd)/database:/app/database \
  --env-file .env \
  -p 3000:3000 \
  rajnandan1/kener
```

Or use **Docker Compose** with the example [docker-compose.yaml](https://raw.githubusercontent.com/rajnandan1/kener/main/docker-compose.yml)

## Base path

By default kener runs on `/` but you can change it to `/status` or any other path. Read more about it [here](/docs/environment-vars/#kener-base-path)
