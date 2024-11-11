# Deployment

```shell
export NODE_ENV=production
npm i
npm run build
npm run serve
```

It also needs 2 yaml files to work

-   site.yaml: Contains information about the site
-   monitors.yaml: Contains your monitors and their related specifications

By default these are present in `config/`. However you can use different location either passing them as argument or having the path as enviorment variable

## Add as Environment variables

```shell
export MONITOR_YAML_PATH=/your/path/monitors.yaml
export SITE_YAML_PATH=/your/path/site.yaml
```

## Add as argument to prod.js

```shell
npm run serve -- --monitors /your/path/monitors.yaml --site /your/path/site.yaml
```

## Install using Docker

[Dockerhub](https://hub.docker.com/r/rajnandan1/kener)

```shell
docker.io/rajnandan1/kener:latest
```

[Github Packages](https://github.com/rajnandan1/kener/pkgs/container/kener)

```shell
ghcr.io/rajnandan1/kener:latest
```

You should mount a host directory to persist your configuration and expose the web port. [Environmental variables](https://rajnandan1.github.io/kener-docs/docs/environment-vars) can be passed with `-e` An example `docker run` command:

Make sure you have a `/static` folder inside your config folder

```shell
docker run -d -v /path/on/host/config:/config -p 3000:3000 -e "GH_TOKEN=1234" rajnandan1/kener
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