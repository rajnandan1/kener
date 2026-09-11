// Shared Docker monitor types: safe to import from both server and client.

import type { DockerCheckType, DockerConnectionType } from "$lib/anywhere.js";

export interface DockerMonitorTypeData {
  /** How Kener reaches the Docker Engine API */
  connectionType: DockerConnectionType;
  /** Socket path (or Windows named pipe) for "socket"; host:port or a full URL for "tcp" and "tls" */
  daemon: string;
  /** PEM material for "tls". `$SECRET` env substitution applies, so a key can stay out of the database. */
  tlsCa?: string;
  tlsCert?: string;
  tlsKey?: string;
  /** "container" watches one container; "daemon" only pings the Engine API */
  checkType: DockerCheckType;
  /** Container name or id. Required when checkType is "container". */
  containerName?: string;
  /** Docker API request timeout in ms */
  timeout?: number;
}
