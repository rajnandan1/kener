---
title: Environment Variables | Kener
description: Kener needs some environment variables to be set to run properly. Here are the list of environment variables that you need to set.
---

# Environment Variables

Kener needs some environment variables to be set to run properly. Here are the list of environment variables that you need to set.

All of these are optional but are required for specific features.

## PORT

Defaults to 3000 if not specified

```shell
export PORT=4242
```

## GH_TOKEN

A github token to read issues and create labels. This is required for **incident management**

```shell
export GH_TOKEN=your-github-token
```

## API_TOKEN

To talk to **kener apis** you will need to set up a token. It uses Bearer Authorization

```shell
export API_TOKEN=sometoken
```

## API_IP

While using API you can set this variable to accept request from a **specific IP**

```shell
export API_IP=127.0.0.1
```

## API_IP_REGEX

While using API you can set this variable to accept request from a specific IP that matches the regex. Below example shows an **IPv6 regex**

```shell
export API_IP_REGEX=^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$
```

If you set both API_IP and API_IP_REGEX, API_IP will be given preference

## KENER_BASE_PATH

By default kener runs on `/` but you can change it to `/status` or any other path.

-   Important: The base path should _**NOT**_ have a trailing slash and should start with `/`
-   Important: This env variable should be present during both build and run time
-   If you are using docker you will have to do your own build and set this env variable during `docker build`

```shell
export KENER_BASE_PATH=/status
```

## Using .env

You can also use a `.env` file to set these variables. Create a `.env` file in the root of the project and add the variables like below

```shell
PORT=4242
GH_TOKEN=your-github-token
API_TOKEN=sometoken
API_IP=
API_IP_REGEX=
KENER_BASE_PATH=/status
```

## Secrets

Kener supports secrets in monitors. Let us say you have a monitor that is API based and you want to keep the API key secret. You can use the `secrets` key in the monitor to keep the API key secret.

```yaml
- name: Example Secret Monitor
  description: Monitor to show how to use secrets
  tag: "secret"
  api:
      method: GET
      url: https://api.example.com/users
      headers:
          Authorization: Bearer $CLIENT_SECRET
```

In the above example, the `CLIENT_SECRET` is a secret that you can set in the monitor. To properly make this work you will have to set up environment variables like below

```shell
export CLIENT_SECRET=your-api-key
```

Remember to set the `CLIENT_SECRET` in your `.env` file if you are using one.
