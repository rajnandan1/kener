import axios, { type AxiosRequestConfig } from "axios";
import https from "https";
import { performance } from "node:perf_hooks";
import type { DockerHostRecord } from "./types/db.js";
import { DOCKER_DEFAULT_TIMEOUT } from "../anywhere.js";

/**
 * Thin client for the Docker Engine HTTP API.
 *
 * The daemon speaks plain HTTP over three transports and Kener supports all of them:
 *   socket → a unix socket path (or a Windows named pipe) handed to Node as `socketPath`
 *   tcp    → an unencrypted `host:port` (typically :2375)
 *   tls    → `host:port` (typically :2376) with client-certificate authentication
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

export interface DockerVersion {
  Version: string;
  ApiVersion: string;
  Os: string;
  Arch: string;
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

/** Connection fields only. This lets callers test a host that has not been saved yet. */
export type DockerConnection = Pick<DockerHostRecord, "connection_type" | "daemon" | "tls_ca" | "tls_cert" | "tls_key">;

/**
 * Normalizes the stored daemon address into a base URL. Accepts bare `host:port`,
 * `tcp://host:port`, and `http(s)://host:port` so operators can paste whatever
 * `DOCKER_HOST` value they already have. Trailing slashes are stripped, otherwise
 * `tcp://host:2375/` would not look like it already carries a port.
 *
 * Exported for unit testing.
 */
export function buildBaseURL(connection: DockerConnection): string {
  const raw = (connection.daemon || "").trim();
  const scheme = connection.connection_type === "tls" ? "https" : "http";
  const withoutScheme = raw.replace(/^(tcp|http|https):\/\//i, "").replace(/\/+$/, "");
  if (!withoutScheme) {
    throw new DockerError("Docker host address is empty");
  }
  const hasPort = /:\d+$/.test(withoutScheme);
  const port = connection.connection_type === "tls" ? 2376 : 2375;
  return `${scheme}://${hasPort ? withoutScheme : `${withoutScheme}:${port}`}`;
}

function buildRequestConfig(connection: DockerConnection, path: string, timeout: number): AxiosRequestConfig {
  const config: AxiosRequestConfig = {
    url: path,
    method: "GET",
    timeout,
    // The monitor inspects the payload itself, so let non-2xx bubble up as DockerError
    // with the daemon's message rather than throwing an opaque axios error.
    validateStatus: () => true,
  };

  if (connection.connection_type === "socket") {
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

  if (connection.connection_type === "tls") {
    config.httpsAgent = new https.Agent({
      ca: connection.tls_ca || undefined,
      cert: connection.tls_cert || undefined,
      key: connection.tls_key || undefined,
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

/** `GET /version`. Used by "Test Connection" to prove we talked to a real daemon. */
export async function getVersion(connection: DockerConnection, timeout = DOCKER_DEFAULT_TIMEOUT) {
  return await request<DockerVersion>(connection, "/version", timeout);
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
