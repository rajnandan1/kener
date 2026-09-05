---
title: Docker Monitors
description: Monitor the state of a Docker container and the availability of the Docker daemon
---

Docker monitors read the state of a container from the [Docker Engine API](https://docs.docker.com/reference/api/engine/). They then set a Kener status. If the container has a `HEALTHCHECK`, the monitor also uses that result.

A **Docker host** is a connection to one Docker Engine. You configure it one time in **Docker Hosts** in the manage dashboard. Many monitors can then use it.

## Minimum setup {#minimum-setup}

1. Go to **Docker Hosts**, then click **New Docker Host**.
2. Select a connection type and enter the address.
3. Click **Test Connection** to make sure that Kener can get access to the daemon.
4. Create a monitor with the type **Docker Container**.
5. Select the host and enter a container name.

Kener communicates with the daemon from the machine where Kener operates. If Kener operates in a container, mount the socket as read-only:

```yaml
services:
    kener:
        volumes:
            - /var/run/docker.sock:/var/run/docker.sock:ro
```

## Connection types {#connection-types}

| Type     | Address field                                        | Notes                                              |
| :------- | :--------------------------------------------------- | :------------------------------------------------- |
| `socket` | `/var/run/docker.sock` (or `\\.\pipe\docker_engine`) | The default. Kener must have access to the socket. |
| `tcp`    | `10.0.0.5:2375`                                      | No encryption. Use only on a trusted network.      |
| `tls`    | `docker.example.com:2376`                            | You must give a client certificate and key in PEM. |

You can write the address as `host:port`. You can also write it with a scheme, such as `tcp://host:port`. If you do not give a port, Kener uses port `2375` for `tcp` and port `2376` for `tls`.

For `tls`, the page does not show the stored client certificate and key again after you save them. Leave these two fields empty to keep the stored values. To replace them, enter both. The certificate and the key are a matched pair, thus you cannot replace only one of them. The page shows the CA field in full. If you clear the CA field, the system uses system CA trust.

> [!CAUTION]
> A user who has access to the Docker socket has root permission on the host. Use a read-only socket proxy if possible. An example is `tecnativa/docker-socket-proxy` with only `CONTAINERS=1` and `VERSION=1`. Do not mount the socket directly, and do not use `tcp://` without TLS.

## Status logic {#status-logic}

For a **Docker daemon** check, the monitor sends a request to `GET /_ping`. If the daemon replies, the status is **UP**. In all other conditions, the status is **DOWN**.

For a **Container** check, the monitor uses this table:

| Container state                 | Status                             |
| :------------------------------ | :--------------------------------- |
| Running, no `HEALTHCHECK`       | **UP**                             |
| Running, health `healthy`       | **UP**                             |
| Running, health `starting`      | **DEGRADED**                       |
| Running, health `unhealthy`     | **DOWN**. You can change this.     |
| Restarting                      | **DEGRADED**. You can change this. |
| Paused                          | **DOWN**. You can change this.     |
| Created, exited, dead, removing | **DOWN**, with the exit code       |
| Not found on the host           | **DOWN**                           |

The latency value is the time of one Docker API request. Thus the latency chart shows the response time of the daemon. It does not show the response time of the software in the container.

## Configuration fields {#configuration-fields}

| Field              | Type     | Default     | Notes                                            |
| :----------------- | :------- | :---------- | :----------------------------------------------- |
| `dockerHostId`     | `number` | None        | Necessary. The id of the configured Docker host. |
| `checkType`        | `string` | `container` | `container` or `daemon`                          |
| `containerName`    | `string` | None        | Container name or id. Necessary for `container`. |
| `unhealthyStatus`  | `string` | `DOWN`      | `DOWN` or `DEGRADED`                             |
| `restartingStatus` | `string` | `DEGRADED`  | `DOWN` or `DEGRADED`                             |
| `pausedStatus`     | `string` | `DOWN`      | `DOWN` or `DEGRADED`                             |
| `timeout`          | `number` | `10000`     | The timeout of a Docker API request, in ms.      |

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

Open the monitor and click **Test Monitor**. For a healthy container, the result is `UP` with the time of the API request. For a container that stopped, the result is `DOWN` with the container state and the exit code.

## Troubleshooting {#troubleshooting}

- **"Docker socket not found"**. The socket is not mounted into the Kener container, or the path is wrong.
- **"Permission denied on the Docker socket"**. The user of the Kener process is not in the `docker` group. Use a socket proxy. Do not make the socket permissions less strict.
- **"Container ... not found"**. The daemon replied, but no container on this host has that name or id. Use the **Browse** control in the monitor editor to see the containers on the host.
- **No container count in Test Connection**. The daemon replied to `/version`, but it refused `/containers`. This is usual when a socket proxy permits only some endpoints. Container monitors continue to fail until you permit `CONTAINERS`.
- **TLS errors**. Give the CA certificate that signed the server certificate of the daemon. Also give the client certificate and the client key.

Related: [Monitors Overview](/docs/v4/monitors/overview), [Grace Period](/docs/v4/monitors/grace-period)
