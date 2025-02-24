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

### Volumes

-   `$(pwd)/uploads` You should mount one host directories to persist your image uploads.
-   `$(pwd)/database` If you are using sqlite, you should mount one host directory to persist your database.

### Environment Variables

[Environment variables](/docs/environment-vars) can be passed with `-e` An example `docker run` command:

Make sure `./database` and `./uploads` directories are present in the root directory.

### Examples

This example is for sqlite. You can also use postgres. Read more about it [here](/docs/environment-vars#database-url)

#### sqlite

```bash
mkdir database uploads
```

```bash
docker run \
  -v $(pwd)/database:/app/database \
  -v $(pwd)/uploads:/app/uploads \
  -p 3000:3000 \
  -e "KENER_SECRET_KEY=somesecretkey" \
  -e "ORIGIN=http://localhost:3000" \
  rajnandan1/kener
```

#### .env

You can also use a .env file

```bash
mkdir database uploads
```

```bash
docker run \
  -v $(pwd)/database:/app/database \
  -v $(pwd)/uploads:/app/uploads \
  --env-file .env \
  -p 3000:3000 \
  rajnandan1/kener
```

Or use **Docker Compose** with the example [docker-compose.yaml](https://raw.githubusercontent.com/rajnandan1/kener/main/docker-compose.yml)

#### Postgres

```bash
mkdir uploads
```

Database folder is not required for postgres.

```bash
docker run \
 -p 3000:3000 \
 -v $(pwd)/uploads:/app/uploads \
 -e "KENER_SECRET_KEY=somesecretkey" \
 -e "DATABASE_URL=postgresql://myuser:mypassword@localhost:5432/mydatabase" \
 -e "ORIGIN=http://localhost:3000" \
 rajnandan1/kener
```

#### MySQL

```bash
mkdir uploads
```

Database folder is not required for mysql.

```bash
docker run \
 -p 3000:3000 \
 -v $(pwd)/uploads:/app/uploads \
 -e "KENER_SECRET_KEY=somesecretkey" \
 -e "DATABASE_URL=mysql://root:password@mysql-container-2.orb.local:3306/kener-2" \
 -e "ORIGIN=http://localhost:3000" \
 rajnandan1/kener
```

#### Base Path

By default Kener runs at the root path (`/`). However, you can configure it to run under a custom subpath. Learn more about this setting [here](/docs/environment-vars/#kener-base-path).

For example, if you want to run Kener under the `/status` subpath, you can set it as follows:

**Docker:**
```bash
 docker run  -p 3000:3000 -e KENER_BASE_PATH=/status -v $(pwd)/database:/app/uploads -v $(pwd)/database:/app/database kener
```

**Docker Compose:**
```yaml
services:
  kener:
    image: rajnandan1/kener:latest
    environment:
      - KENER_BASE_PATH=/status
```

## Railway

You can deploy Kener on [Railway](https://railway.app) with a single click.

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/template/spSvic?referralCode=1Pn7vs)
