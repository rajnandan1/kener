import db from "../db/db.js";
import { DOCKER_CONNECTION_TYPES, type DockerConnectionTypeOption } from "../../anywhere.js";
import { DockerError, containerDisplayName, getVersion, listContainers, type DockerConnection } from "../docker.js";
import { GetMonitorsParsed } from "./monitorsController.js";
import type { DockerHostRecord, DockerHostInsert } from "../types/db.js";
import type { DockerMonitorTypeData } from "../types/monitor.js";

export interface DockerHostInput extends Partial<DockerHostInsert> {
  id?: number;
}

/**
 * Docker hosts hold credentials, so the manage UI never receives the private key
 * material back — only whether each field is populated.
 */
export interface DockerHostView extends Omit<DockerHostRecord, "tls_ca" | "tls_cert" | "tls_key"> {
  has_tls_ca: boolean;
  has_tls_cert: boolean;
  has_tls_key: boolean;
}

function toView(host: DockerHostRecord): DockerHostView {
  const { tls_ca, tls_cert, tls_key, ...rest } = host;
  return {
    ...rest,
    has_tls_ca: !!tls_ca,
    has_tls_cert: !!tls_cert,
    has_tls_key: !!tls_key,
  };
}

function normalizeInput(input: DockerHostInput): DockerHostInsert {
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

  if (connectionType === "tls" && (!input.tls_cert || !input.tls_key)) {
    throw new Error("TLS connections require both a client certificate and a client key");
  }

  return {
    name,
    connection_type: connectionType,
    daemon,
    // TLS material is only meaningful for the tls transport; drop it otherwise so
    // switching a host to socket/tcp does not leave stale keys behind.
    tls_ca: connectionType === "tls" ? input.tls_ca || null : null,
    tls_cert: connectionType === "tls" ? input.tls_cert || null : null,
    tls_key: connectionType === "tls" ? input.tls_key || null : null,
  };
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
  const data = normalizeInput(input);

  const existingName = await db.getDockerHostByName(data.name);
  if (existingName && existingName.id !== input.id) {
    throw new Error("A Docker host with this name already exists");
  }

  if (input.id) {
    const current = await db.getDockerHostById(input.id);
    if (!current) {
      throw new Error("Docker host not found");
    }
    // Blank TLS fields on an update mean "keep what is stored" so the UI never has to
    // round-trip secrets it was not shown.
    if (data.connection_type === "tls") {
      data.tls_ca = data.tls_ca ?? current.tls_ca;
      data.tls_cert = data.tls_cert || current.tls_cert;
      data.tls_key = data.tls_key || current.tls_key;
      if (!data.tls_cert || !data.tls_key) {
        throw new Error("TLS connections require both a client certificate and a client key");
      }
    }
    await db.updateDockerHost({ ...data, id: input.id });
    const updated = await db.getDockerHostById(input.id);
    return toView(updated as DockerHostRecord);
  }

  const id = await db.createDockerHost(data);
  const created = await db.getDockerHostById(id);
  return toView(created as DockerHostRecord);
};

/**
 * Refuses to delete a host that monitors still point at — otherwise those monitors
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
    // Fall back to the stored TLS material when the form did not re-send it.
    if (input.connection_type && input.daemon) {
      const draft = normalizeInput({ ...input, name: input.name || host.name });
      return {
        connection_type: draft.connection_type,
        daemon: draft.daemon,
        tls_ca: draft.connection_type === "tls" ? (draft.tls_ca ?? host.tls_ca) : null,
        tls_cert: draft.connection_type === "tls" ? draft.tls_cert || host.tls_cert : null,
        tls_key: draft.connection_type === "tls" ? draft.tls_key || host.tls_key : null,
      };
    }
    return host;
  }

  const draft = normalizeInput({ ...input, name: input.name || "draft" });
  return draft as DockerConnection;
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
