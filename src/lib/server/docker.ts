import axios, { type AxiosRequestConfig } from "axios";
import https from "https";
import { performance } from "node:perf_hooks";
import { DOCKER_CONNECTION_TYPES, DOCKER_DEFAULT_TIMEOUT } from "../anywhere.js";
import { GetRequiredSecrets, ReplaceAllOccurrences } from "./tool.js";
import type { DockerConnectionType } from "../anywhere.js";
import type { DockerMonitorTypeData } from "../types/docker.js";

/**
 * Thin client for the Docker Engine HTTP API.
 *
 * The daemon speaks plain HTTP over three transports and Kener supports all of them:
 *   socket → a unix socket path (or a Windows named pipe) handed to Node as `socketPath`
 *   tcp    → an unencrypted `host:port` (typically :2375)
 *   tls    → `host:port` (typically :2376), optionally with client-certificate authentication
 *
 * Requests are intentionally unversioned (`/containers/...` rather than `/v1.44/containers/...`)
 * so the daemon answers with its own newest API version instead of us pinning one.
 */

/** Subset of `GET /containers/{id}/json` that the DOCKER monitor reads. */
export interface DockerContainerState {
  Status: string; // created | running | paused | restarting | removing | exited | dead
  Running: boolean;
  Paused: boolean;
  Restarting: boolean;
  Dead: boolean;
  ExitCode: number;
  StartedAt: string;
  FinishedAt: string;
  Error?: string;
  Health?: {
    Status: string; // starting | healthy | unhealthy | none
    FailingStreak: number;
    Log?: Array<{ ExitCode: number; Output: string }>;
  };
}

export interface DockerContainerInspect {
  Id: string;
  Name: string;
  State: DockerContainerState;
}

/** Subset of `GET /containers/json` used to populate the container picker. */
export interface DockerContainerSummary {
  Id: string;
  Names: string[];
  Image: string;
  State: string;
  Status: string;
}

export class DockerError extends Error {
  /** HTTP status returned by the daemon, when it answered at all. */
  statusCode?: number;
  /** True when the request exceeded the configured timeout. */
  isTimeout: boolean;

  constructor(message: string, options?: { statusCode?: number; isTimeout?: boolean }) {
    super(message);
    this.name = "DockerError";
    this.statusCode = options?.statusCode;
    this.isTimeout = options?.isTimeout ?? false;
  }
}

/** Connection fields of a DOCKER monitor with every `$SECRET` reference already resolved. */
export interface DockerConnection {
  connectionType: DockerConnectionType;
  daemon: string;
  tlsCa?: string;
  tlsCert?: string;
  tlsKey?: string;
}

/**
 * Turns a monitor's type_data into a connection. `$SECRET` tokens in the daemon
 * address and the PEM fields are replaced from the environment, exactly like API
 * monitor headers, so a private key can live in `DOCKER_TLS_KEY` instead of the
 * database and the browser. Unknown tokens are left as-is.
 */
export function resolveConnection(typeData: Partial<DockerMonitorTypeData> | undefined): DockerConnection {
  const td = typeData ?? {};
  const connectionType = td.connectionType as DockerConnectionType;
  if (!DOCKER_CONNECTION_TYPES.includes(connectionType)) {
    throw new DockerError(`Docker connection type must be one of: ${DOCKER_CONNECTION_TYPES.join(", ")}`);
  }

  // Coerce rather than trust the shape: type_data comes from JSON and the browse
  // action takes the unsaved form, so a stray number, null, or object must not throw.
  const text = (value: unknown): string =>
    value == null || typeof value === "object" || typeof value === "function" ? "" : String(value).trim();
  const raw = { daemon: text(td.daemon), tlsCa: text(td.tlsCa), tlsCert: text(td.tlsCert), tlsKey: text(td.tlsKey) };
  const secrets = GetRequiredSecrets(Object.values(raw).join(" "));
  const substitute = (value: string): string => {
    let out = value;
    for (const secret of secrets) {
      if (secret.replace !== undefined) out = ReplaceAllOccurrences(out, secret.find, secret.replace);
    }
    return out;
  };

  return {
    connectionType,
    daemon: substitute(raw.daemon),
    tlsCa: substitute(raw.tlsCa) || undefined,
    tlsCert: substitute(raw.tlsCert) || undefined,
    tlsKey: substitute(raw.tlsKey) || undefined,
  };
}

/**
 * Normalizes the daemon address into a base URL. Accepts bare `host:port`,
 * `tcp://host:port`, and `http(s)://host:port` so operators can paste whatever
 * `DOCKER_HOST` value they already have. Trailing slashes are stripped, otherwise
 * `tcp://host:2375/` would not look like it already carries a port.
 *
 * Exported for unit testing.
 */
export function buildBaseURL(connection: DockerConnection): string {
  const raw = (connection.daemon || "").trim();
  const scheme = connection.connectionType === "tls" ? "https" : "http";
  const withoutScheme = raw.replace(/^(tcp|http|https):\/\//i, "").replace(/\/+$/, "");
  if (!withoutScheme) {
    throw new DockerError("Docker host address is empty");
  }
  const hasPort = /:\d+$/.test(withoutScheme);
  const port = connection.connectionType === "tls" ? 2376 : 2375;
  return `${scheme}://${hasPort ? withoutScheme : `${withoutScheme}:${port}`}`;
}

/** Exported for unit testing. */
export function buildRequestConfig(connection: DockerConnection, path: string, timeout: number): AxiosRequestConfig {
  const config: AxiosRequestConfig = {
    url: path,
    method: "GET",
    timeout,
    // The monitor inspects the payload itself, so let non-2xx bubble up as DockerError
    // with the daemon's message rather than throwing an opaque axios error.
    validateStatus: () => true,
  };

  if (connection.connectionType === "socket") {
    const socketPath = (connection.daemon || "").trim();
    if (!socketPath) {
      throw new DockerError("Docker socket path is empty");
    }
    config.socketPath = socketPath;
    // Host is ignored when socketPath is set, but axios still needs an absolute URL.
    config.baseURL = "http://localhost";
    return config;
  }

  config.baseURL = buildBaseURL(connection);

  if (connection.connectionType === "tls") {
    // A certificate without its key (or the reverse) only fails at handshake time
    // with an unhelpful message, so refuse it up front.
    if (!!connection.tlsCert !== !!connection.tlsKey) {
      throw new DockerError("Provide the TLS client certificate and key together");
    }
    config.httpsAgent = new https.Agent({
      ca: connection.tlsCa,
      cert: connection.tlsCert,
      key: connection.tlsKey,
    });
  }

  return config;
}

interface DockerResponse<T> {
  data: T;
  /** Round-trip time of the daemon call in milliseconds. */
  latency: number;
}

async function request<T>(connection: DockerConnection, path: string, timeout: number): Promise<DockerResponse<T>> {
  const config = buildRequestConfig(connection, path, timeout);
  const start = performance.now();

  let response;
  try {
    response = await axios.request(config);
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    const isTimeout = err.code === "ECONNABORTED" || err.code === "ETIMEDOUT";
    throw new DockerError(isTimeout ? `Docker API request timed out after ${timeout}ms` : describeError(err), {
      isTimeout,
    });
  }

  const latency = Math.round(performance.now() - start);

  if (response.status >= 400) {
    const body = response.data as { message?: string } | string | undefined;
    const message = typeof body === "object" && body?.message ? body.message : `HTTP ${response.status}`;
    throw new DockerError(message, { statusCode: response.status });
  }

  return { data: response.data as T, latency };
}

function describeError(err: { code?: string; message?: string }): string {
  switch (err.code) {
    case "ENOENT":
      return "Docker socket not found. Is the daemon running and the socket mounted into Kener?";
    case "EACCES":
      return "Permission denied on the Docker socket. The Kener process needs access to it.";
    case "ECONNREFUSED":
      return "Connection refused by the Docker daemon";
    default:
      return err.message || "Unknown Docker API error";
  }
}

/** `GET /_ping`. The cheapest liveness check the daemon offers. */
export async function pingDaemon(connection: DockerConnection, timeout = DOCKER_DEFAULT_TIMEOUT) {
  return await request<string>(connection, "/_ping", timeout);
}

/** `GET /containers/{id}/json`. Accepts a container name or id. */
export async function inspectContainer(
  connection: DockerConnection,
  container: string,
  timeout = DOCKER_DEFAULT_TIMEOUT,
) {
  return await request<DockerContainerInspect>(
    connection,
    `/containers/${encodeURIComponent(container)}/json`,
    timeout,
  );
}

/** `GET /containers/json?all=1`. Every container, running or not. */
export async function listContainers(connection: DockerConnection, timeout = DOCKER_DEFAULT_TIMEOUT) {
  return await request<DockerContainerSummary[]>(connection, "/containers/json?all=1", timeout);
}

/** Docker prefixes container names with a slash; strip it for display. */
export function containerDisplayName(names: string[] | undefined): string {
  const name = names?.[0] ?? "";
  return name.startsWith("/") ? name.slice(1) : name;
}
