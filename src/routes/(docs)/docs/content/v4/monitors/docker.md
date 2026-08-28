---
title: Docker Monitors
description: Track Docker container health and daemon availability through the Docker Engine API
---

Docker monitors query the [Docker Engine API](https://docs.docker.com/reference/api/engine/) and map a container's state — including its `HEALTHCHECK` result — to a Kener status.

A **Docker host** is a reusable connection to one Docker Engine. Configure it once under **Docker Hosts** in the manage dashboard, then point any number of monitors at it.

## Minimum setup {#minimum-setup}

1. Go to **Docker Hosts → New Docker Host**, pick a connection type, and enter the address.
2. Click **Test Connection** to confirm Kener can reach the daemon.
3. Create a monitor with type **Docker Container**, select the host, and enter a container name.

Kener talks to the daemon from the machine it runs on. If Kener itself runs in a container, mount the socket read-only:

```yaml
services:
    kener:
        volumes:
            - /var/run/docker.sock:/var/run/docker.sock:ro
```

## Connection types {#connection-types}

| Type     | Address field                                        | Notes                                             |
| :------- | :--------------------------------------------------- | :------------------------------------------------ |
| `socket` | `/var/run/docker.sock` (or `\\.\pipe\docker_engine`) | Default; requires the socket to be reachable      |
| `tcp`    | `10.0.0.5:2375`                                      | Unencrypted — trusted networks only               |
| `tls`    | `docker.example.com:2376`                            | Requires a client certificate and key in PEM form |

Addresses may be written bare (`host:port`) or with a scheme (`tcp://host:port`). The port defaults to `2375` for `tcp` and `2376` for `tls`.

For `tls`, the stored client certificate and key are never shown again after saving — leave those fields blank when editing to keep them unchanged. The CA field is shown in full and is authoritative: clearing it falls back to system CA trust.

> [!CAUTION]
> Access to the Docker socket is equivalent to root on the host. Prefer a read-only socket proxy (for example `tecnativa/docker-socket-proxy` with only `CONTAINERS=1` and `VERSION=1` enabled) over mounting the raw socket or exposing `tcp://` without TLS.

## Status logic {#status-logic}

For **Docker daemon** checks, `GET /_ping` answering means **UP**; anything else is **DOWN**.

For **Container** checks:

| Container state                 | Status                                 |
| :------------------------------ | :------------------------------------- |
| Running, no `HEALTHCHECK`       | **UP**                                 |
| Running, health `healthy`       | **UP**                                 |
| Running, health `starting`      | **DEGRADED**                           |
| Running, health `unhealthy`     | Configurable — **DOWN** by default     |
| Restarting                      | Configurable — **DEGRADED** by default |
| Paused                          | Configurable — **DOWN** by default     |
| Created, exited, dead, removing | **DOWN** (exit code in the message)    |
| Not found on the host           | **DOWN**                               |

Latency is the round-trip time of the Docker API call, so the latency chart tracks daemon responsiveness rather than anything inside the container.

## Configuration fields {#configuration-fields}

| Field              | Type     | Default     | Notes                                          |
| :----------------- | :------- | :---------- | :--------------------------------------------- |
| `dockerHostId`     | `number` | —           | Required; id of the configured Docker host     |
| `checkType`        | `string` | `container` | `container` or `daemon`                        |
| `containerName`    | `string` | —           | Container name or id; required for `container` |
| `unhealthyStatus`  | `string` | `DOWN`      | `DOWN` or `DEGRADED`                           |
| `restartingStatus` | `string` | `DEGRADED`  | `DOWN` or `DEGRADED`                           |
| `pausedStatus`     | `string` | `DOWN`      | `DOWN` or `DEGRADED`                           |
| `timeout`          | `number` | `10000`     | Docker API request timeout in ms               |

## Example {#example}

```json
{
    "type": "DOCKER",
    "type_data": {
        "dockerHostId": 1,
        "checkType": "container",
        "containerName": "kener-app",
        "unhealthyStatus": "DEGRADED",
        "restartingStatus": "DEGRADED",
        "pausedStatus": "DOWN",
        "timeout": 10000
    }
}
```

## Verify {#verify}

Open the monitor and click **Test Monitor**. A healthy container returns `UP` with the API round-trip latency; a stopped one returns `DOWN` with the container state and exit code.

## Troubleshooting {#troubleshooting}

- **"Docker socket not found"** — the socket is not mounted into the Kener container, or the path is wrong.
- **"Permission denied on the Docker socket"** — the Kener process user is not in the `docker` group. Use a socket proxy instead of loosening socket permissions.
- **"Container ... not found"** — the daemon answered, but no container matches that name or id on this host. Use **Browse** in the monitor editor to list what the host actually runs.
- **Container count missing in Test Connection** — the daemon replied to `/version` but blocked `/containers`. Expected when a socket proxy only exposes some endpoints; container monitors will still fail until `CONTAINERS` is allowed.
- **TLS errors** — supply the CA certificate that signed the daemon's server certificate, along with the client certificate and key.

Related: [Monitors Overview](/docs/v4/monitors/overview), [Grace Period](/docs/v4/monitors/grace-period)
