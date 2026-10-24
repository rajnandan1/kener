---
title: Docker Monitors
description: Monitor a Docker container's state and healthcheck, or the Docker daemon itself, from the Docker Engine API
---

Docker monitors read a container's state from the [Docker Engine API](https://docs.docker.com/reference/api/engine/) and map it to a Kener status. If the container has a `HEALTHCHECK`, its result is used too. The connection to the daemon is part of the monitor, like every other monitor type.

## Minimum setup {#minimum-setup}

1. Create a monitor with the type **Docker Container**.
2. Check the connection type and the socket path or daemon address. They start on [`DOCKER_HOST`](#default-connection) when it is set.
3. Enter the container name, or click **Browse** to pick one from the daemon.
4. Click **Save**. Test Monitor runs against the saved settings.
5. Click **Test Monitor**.

Kener talks to the daemon from the machine it runs on. If Kener itself runs in a container, mount the socket:

```yaml
services:
    kener:
        volumes:
            - /var/run/docker.sock:/var/run/docker.sock
```

> [!CAUTION]
> Anyone who can reach the Docker socket is root on the host, and a `:ro` mount does not limit the API. Put a deny-by-default socket proxy in front of it. Kener only needs `GET /_ping`, `GET /containers/json`, and `GET /containers/{name}/json`. With `tecnativa/docker-socket-proxy`, `CONTAINERS=1` grants those but also every other `GET` under `/containers`, including logs, `archive`, and `export`; a proxy with path-level allowlisting can restrict it to the three paths above. Never expose `tcp` without TLS outside a trusted network.

## Connection types {#connection-types}

| Type     | Address                                              | Notes                                                                                                          |
| :------- | :--------------------------------------------------- | :------------------------------------------------------------------------------------------------------------- |
| `socket` | `/var/run/docker.sock` (or `\\.\pipe\docker_engine`) | Default unless [`DOCKER_HOST`](#default-connection) is set. The Kener process needs read access to the socket. |
| `tcp`    | `10.0.0.5:2375`                                      | No encryption. Trusted networks only.                                                                          |
| `tls`    | `docker.example.com:2376`                            | HTTPS, optionally with a client certificate and key for `--tlsverify`.                                         |

The address may carry a scheme (`tcp://host:port`). Without a port, Kener uses `2375` for `tcp` and `2376` for `tls`.

### Default connection {#default-connection}

A new Docker monitor starts on the local socket. Behind a socket proxy, set the standard Docker variable once, and every new Docker monitor starts on the proxy instead:

```yaml
services:
    kener:
        environment:
            - DOCKER_HOST=tcp://docker-socket-proxy:2375
```

| `DOCKER_HOST`                                            | The form starts on                 |
| :------------------------------------------------------- | :--------------------------------- |
| unset                                                    | `socket`, `/var/run/docker.sock`   |
| `unix:///run/proxy/docker.sock`                          | `socket`, `/run/proxy/docker.sock` |
| `tcp://docker-socket-proxy:2375`                         | `tcp`, `docker-socket-proxy:2375`  |
| `tcp://...` with `DOCKER_TLS_VERIFY` or `DOCKER_TLS` set | `tls`, the same address            |

Any other scheme, such as `ssh://` or `npipe://`, logs one warning and keeps the local socket. A saved monitor keeps its own connection. The variable only fills the dashboard form: a monitor created through the API must send `connectionType` and `daemon`. TLS certificates stay per monitor, as [below](#tls-secrets).

### Keeping the TLS key out of the database {#tls-secrets}

The three PEM fields accept `$SECRET` references, the same substitution API monitor headers use. Set the PEM in an environment variable and reference it:

```bash
DOCKER_TLS_KEY="-----BEGIN PRIVATE KEY-----
..."
```

Then enter `$DOCKER_TLS_KEY` as the client key. Kener resolves it on every check, so the key never reaches the database or the browser. The certificate and key are a pair: provide both or neither.

## Status logic {#status-logic}

**Docker daemon** checks call `GET /_ping`: **UP** when the daemon answers, otherwise **DOWN**. Use one as the parent monitor for a host.

**Container** checks use this table:

| Container state                      | Status                               |
| :----------------------------------- | :----------------------------------- |
| Running, no `HEALTHCHECK` or healthy | **UP**                               |
| Running, healthcheck `starting`      | **DEGRADED**                         |
| Restarting                           | **DEGRADED**                         |
| Running, healthcheck `unhealthy`     | **DOWN**, with the last probe output |
| Paused                               | **DOWN**                             |
| Created, exited, dead, removing      | **DOWN**, with the exit code         |
| Not found on the daemon              | **DOWN**                             |

Latency is the round-trip time of the Docker API call, so the latency chart shows daemon responsiveness, not the application inside the container.

## Configuration fields {#configuration-fields}

| Field            | Type     | Default                                                              | Notes                                                  |
| :--------------- | :------- | :------------------------------------------------------------------- | :----------------------------------------------------- |
| `connectionType` | `string` | `socket`, or from [`DOCKER_HOST`](#default-connection)               | `socket`, `tcp`, or `tls`                              |
| `daemon`         | `string` | `/var/run/docker.sock`, or from [`DOCKER_HOST`](#default-connection) | Required. Socket path, or `host:port` for tcp and tls. |
| `tlsCa`          | `string` | None                                                                 | CA PEM for `tls`. `$SECRET` allowed.                   |
| `tlsCert`        | `string` | None                                                                 | Client certificate PEM for `tls`. `$SECRET` allowed.   |
| `tlsKey`         | `string` | None                                                                 | Client key PEM for `tls`. `$SECRET` allowed.           |
| `checkType`      | `string` | `container`                                                          | `container` or `daemon`                                |
| `containerName`  | `string` | None                                                                 | Container name or id. Required for `container`.        |
| `timeout`        | `number` | `10000`                                                              | Docker API request timeout in ms                       |

## Example {#example}

```json
{
    "monitor_type": "DOCKER",
    "type_data": {
        "connectionType": "tls",
        "daemon": "docker.example.com:2376",
        "tlsCa": "$DOCKER_TLS_CA",
        "tlsCert": "$DOCKER_TLS_CERT",
        "tlsKey": "$DOCKER_TLS_KEY",
        "checkType": "container",
        "containerName": "kener-app",
        "timeout": 10000
    }
}
```

## Verify {#verify}

Save the monitor, then click **Test Monitor**. A healthy container returns `UP` with the API round-trip time. A stopped one returns `DOWN` with the container state and exit code.

## Troubleshooting {#troubleshooting}

- **"Docker socket not found"**: the socket is not mounted into the Kener container, or the path is wrong.
- **"Permission denied on the Docker socket"**: the Kener process cannot read the socket. Use a socket proxy rather than loosening the socket permissions.
- **"Container ... not found"**: the daemon answered, but no container has that name or id. Click **Browse** to see what the daemon reports.
- **Browse fails behind a socket proxy**: the proxy must allow `CONTAINERS`. Container checks fail the same way until it does.
- **TLS errors**: give the CA that signed the daemon's certificate, and the client certificate and key together if the daemon runs with `--tlsverify`.

Related: [Monitors Overview](/docs/v4/monitors/overview), [API Monitors](/docs/v4/monitors/api) for the `$SECRET` substitution rules
