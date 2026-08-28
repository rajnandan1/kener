import db from "$lib/server/db/db";
import { DOCKER_CONNECTION_TYPES } from "../../anywhere.js";
import { DockerError, containerDisplayName, getVersion, listContainers } from "../docker.js";
import { GetMonitorsParsed } from "./monitorsController.js";
import type { DockerConnectionTypeOption } from "../../anywhere.js";
import type { DockerConnection } from "../docker.js";
import type { DockerHostRecord, DockerHostInsert } from "../types/db.js";
import type { DockerMonitorTypeData } from "../types/monitor.js";

export interface DockerHostInput extends Partial<DockerHostInsert> {
  id?: number;
}

/**
 * A fully-resolved host payload. Intersecting with DockerConnection drops the
 * `undefined` from the optional TLS fields, so the result is usable both as a
 * database insert and as a connection to hand straight to the Docker client.
 */
type NormalizedDockerHost = DockerHostInsert & DockerConnection;

/**
 * Docker hosts hold credentials, so the manage UI never receives the client
 * certificate or private key back. It receives only a flag for each of them.
 *
 * `tls_ca` is deliberately returned in full: a CA certificate is public material,
 * and round-tripping it is what lets a blank CA field mean "clear it" rather than
 * being indistinguishable from "unchanged".
 */
export interface DockerHostView extends Omit<DockerHostRecord, "tls_cert" | "tls_key"> {
  has_tls_cert: boolean;
  has_tls_key: boolean;
}

function toView(host: DockerHostRecord): DockerHostView {
  const { tls_cert, tls_key, ...rest } = host;
  return {
    ...rest,
    has_tls_cert: !!tls_cert,
    has_tls_key: !!tls_key,
  };
}

/**
 * Validates and canonicalizes a host payload.
 *
 * `existing` is the stored row when this is an update. The manage UI never receives
 * the client certificate or key, so it sends those fields blank to mean "keep what
 * is stored". This function merges them before it checks for completeness, which makes
 * editing an existing TLS host (or testing it) work.
 */
function normalizeInput(input: DockerHostInput, existing?: DockerHostRecord): NormalizedDockerHost {
  const name = (input.name || "").trim();
  if (!name) {
    throw new Error("Name is required");
  }

  const connectionType = input.connection_type as DockerConnectionTypeOption;
  if (!DOCKER_CONNECTION_TYPES.includes(connectionType)) {
    throw new Error(`Connection type must be one of: ${DOCKER_CONNECTION_TYPES.join(", ")}`);
  }

  const daemon = (input.daemon || "").trim();
  if (!daemon) {
    throw new Error(connectionType === "socket" ? "Socket path is required" : "Daemon address (host:port) is required");
  }

  // TLS material is only meaningful for the tls transport; drop it otherwise so
  // switching a host to socket/tcp does not leave stale keys behind.
  if (connectionType !== "tls") {
    return { name, connection_type: connectionType, daemon, tls_ca: null, tls_cert: null, tls_key: null };
  }

  // Blank cert/key mean "keep stored". They are write-only in the UI, so blank can
  // only ever mean unchanged. The CA round-trips, so blank there means "clear it".
  const tls_cert = (input.tls_cert || "").trim() || existing?.tls_cert || null;
  const tls_key = (input.tls_key || "").trim() || existing?.tls_key || null;
  const tls_ca = (input.tls_ca || "").trim() || null;

  if (!tls_cert || !tls_key) {
    throw new Error("TLS connections require both a client certificate and a client key");
  }

  return { name, connection_type: connectionType, daemon, tls_ca, tls_cert, tls_key };
}

export const GetDockerHosts = async (): Promise<DockerHostView[]> => {
  const hosts = await db.getDockerHosts();
  return hosts.map(toView);
};

export const GetDockerHostById = async (id: number): Promise<DockerHostView | undefined> => {
  const host = await db.getDockerHostById(id);
  return host ? toView(host) : undefined;
};

export const CreateUpdateDockerHost = async (input: DockerHostInput): Promise<DockerHostView> => {
  const current = input.id ? await db.getDockerHostById(input.id) : undefined;
  if (input.id && !current) {
    throw new Error("Docker host not found");
  }

  const data = normalizeInput(input, current);

  const existingName = await db.getDockerHostByName(data.name);
  if (existingName && existingName.id !== input.id) {
    throw new Error("A Docker host with this name already exists");
  }

  if (input.id) {
    await db.updateDockerHost({ ...data, id: input.id });
    const updated = await db.getDockerHostById(input.id);
    return toView(updated as DockerHostRecord);
  }

  const id = await db.createDockerHost(data);
  const created = await db.getDockerHostById(id);
  return toView(created as DockerHostRecord);
};

/**
 * Refuses to delete a host that monitors still point at. Without this check, those monitors
 * would silently start reporting DOWN with a "host no longer exists" message.
 */
export const DeleteDockerHost = async (id: number): Promise<{ success: true }> => {
  const host = await db.getDockerHostById(id);
  if (!host) {
    throw new Error("Docker host not found");
  }

  const usedBy = await GetMonitorsUsingDockerHost(id);
  if (usedBy.length > 0) {
    throw new Error(
      `Cannot delete: ${usedBy.length} monitor(s) still use this host (${usedBy.slice(0, 5).join(", ")})`,
    );
  }

  await db.deleteDockerHost(id);
  return { success: true };
};

/** Tags of every DOCKER monitor bound to the given host. */
export const GetMonitorsUsingDockerHost = async (id: number): Promise<string[]> => {
  const monitors = await GetMonitorsParsed({ monitor_type: "DOCKER" });
  return monitors
    .filter(
      (monitor) => Number((monitor.type_data as unknown as DockerMonitorTypeData | undefined)?.dockerHostId) === id,
    )
    .map((monitor) => monitor.tag);
};

/**
 * Resolves the connection to test: a saved host by id, or an unsaved form payload so
 * operators can validate credentials before committing them.
 */
async function resolveConnection(input: DockerHostInput): Promise<DockerConnection> {
  if (input.id) {
    const host = await db.getDockerHostById(input.id);
    if (!host) {
      throw new Error("Docker host not found");
    }
    // Testing an unmodified saved host: use it as stored.
    if (!input.connection_type || !input.daemon) {
      return host;
    }
    // Testing edits in the form: normalizeInput merges any TLS material the form
    // did not re-send, so a blank cert/key still tests against the stored ones.
    return normalizeInput({ ...input, name: input.name || host.name }, host);
  }

  return normalizeInput({ ...input, name: input.name || "draft" });
}

export interface DockerHostTestResult {
  success: boolean;
  latency: number;
  version?: string;
  apiVersion?: string;
  platform?: string;
  containerCount?: number;
  error?: string;
}

export const TestDockerHost = async (input: DockerHostInput): Promise<DockerHostTestResult> => {
  try {
    const connection = await resolveConnection(input);
    const { data, latency } = await getVersion(connection);
    let containerCount: number | undefined;
    try {
      const containers = await listContainers(connection);
      containerCount = containers.data.length;
    } catch {
      // Version succeeded, so the daemon is reachable; a proxy may simply block /containers.
      containerCount = undefined;
    }
    return {
      success: true,
      latency,
      version: data.Version,
      apiVersion: data.ApiVersion,
      platform: `${data.Os}/${data.Arch}`,
      containerCount,
    };
  } catch (error: unknown) {
    const message = error instanceof DockerError || error instanceof Error ? error.message : "Unknown Docker API error";
    return { success: false, latency: 0, error: message };
  }
};

export interface DockerContainerOption {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
}

/** Container picker data for the DOCKER monitor editor. */
export const ListDockerContainers = async (id: number): Promise<DockerContainerOption[]> => {
  const host = await db.getDockerHostById(id);
  if (!host) {
    throw new Error("Docker host not found");
  }
  const { data } = await listContainers(host);
  return data.map((container) => ({
    id: container.Id.slice(0, 12),
    name: containerDisplayName(container.Names),
    image: container.Image,
    state: container.State,
    status: container.Status,
  }));
};
