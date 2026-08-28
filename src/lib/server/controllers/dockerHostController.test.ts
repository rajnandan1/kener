import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DockerHostRecord } from "../types/db";

const dbMock = vi.hoisted(() => ({
  getDockerHosts: vi.fn(),
  getDockerHostById: vi.fn(),
  getDockerHostByName: vi.fn(),
  createDockerHost: vi.fn(),
  updateDockerHost: vi.fn(),
  deleteDockerHost: vi.fn(),
}));
const { getVersion, listContainers } = vi.hoisted(() => ({
  getVersion: vi.fn(),
  listContainers: vi.fn(),
}));

vi.mock("$lib/server/db/db", () => ({ default: dbMock }));
vi.mock("../docker.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../docker")>();
  return { ...actual, getVersion, listContainers };
});
vi.mock("./monitorsController.js", () => ({ GetMonitorsParsed: vi.fn().mockResolvedValue([]) }));

const { CreateUpdateDockerHost, GetDockerHosts, TestDockerHost } = await import("./dockerHostController");

const TLS_HOST: DockerHostRecord = {
  id: 1,
  name: "prod",
  connection_type: "tls",
  daemon: "docker.example.com:2376",
  tls_ca: "STORED-CA",
  tls_cert: "STORED-CERT",
  tls_key: "STORED-KEY",
  created_at: new Date(),
  updated_at: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.getDockerHostByName.mockResolvedValue(undefined);
  dbMock.getDockerHostById.mockResolvedValue(TLS_HOST);
  dbMock.updateDockerHost.mockResolvedValue(1);
  dbMock.createDockerHost.mockResolvedValue(2);
});

describe("editing an existing TLS host", () => {
  // Regression: normalizeInput used to reject blank cert/key before the stored
  // values were merged, so any edit to a saved TLS host failed.
  it("keeps the stored certificate and key when the form sends them blank", async () => {
    await CreateUpdateDockerHost({
      id: 1,
      name: "prod renamed",
      connection_type: "tls",
      daemon: "docker.example.com:2376",
      tls_ca: "STORED-CA",
      tls_cert: null,
      tls_key: null,
    });

    expect(dbMock.updateDockerHost).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, name: "prod renamed", tls_cert: "STORED-CERT", tls_key: "STORED-KEY" }),
    );
  });

  it("replaces the certificate and key when new ones are supplied", async () => {
    await CreateUpdateDockerHost({
      id: 1,
      name: "prod",
      connection_type: "tls",
      daemon: "docker.example.com:2376",
      tls_cert: "NEW-CERT",
      tls_key: "NEW-KEY",
    });

    expect(dbMock.updateDockerHost).toHaveBeenCalledWith(
      expect.objectContaining({ tls_cert: "NEW-CERT", tls_key: "NEW-KEY" }),
    );
  });

  // A certificate and its key are a matched pair. Replacing one and taking the other
  // from storage persists a mismatched pair that only fails later, at connection time.
  it("rejects a new certificate without a matching new key", async () => {
    await expect(
      CreateUpdateDockerHost({
        id: 1,
        name: "prod",
        connection_type: "tls",
        daemon: "docker.example.com:2376",
        tls_cert: "NEW-CERT",
        tls_key: null,
      }),
    ).rejects.toThrow("Replace the client certificate and the client key together");
    expect(dbMock.updateDockerHost).not.toHaveBeenCalled();
  });

  it("rejects a new key without a matching new certificate", async () => {
    await expect(
      CreateUpdateDockerHost({
        id: 1,
        name: "prod",
        connection_type: "tls",
        daemon: "docker.example.com:2376",
        tls_cert: null,
        tls_key: "NEW-KEY",
      }),
    ).rejects.toThrow("Replace the client certificate and the client key together");
    expect(dbMock.updateDockerHost).not.toHaveBeenCalled();
  });

  it("clears the CA when the field is blanked, falling back to system trust", async () => {
    await CreateUpdateDockerHost({
      id: 1,
      name: "prod",
      connection_type: "tls",
      daemon: "docker.example.com:2376",
      tls_ca: "",
      tls_cert: null,
      tls_key: null,
    });

    expect(dbMock.updateDockerHost).toHaveBeenCalledWith(expect.objectContaining({ tls_ca: null }));
  });

  it("drops all TLS material when switched to a socket connection", async () => {
    await CreateUpdateDockerHost({ id: 1, name: "prod", connection_type: "socket", daemon: "/var/run/docker.sock" });

    expect(dbMock.updateDockerHost).toHaveBeenCalledWith(
      expect.objectContaining({ tls_ca: null, tls_cert: null, tls_key: null }),
    );
  });
});

describe("creating a TLS host", () => {
  it("still requires a certificate and key", async () => {
    dbMock.getDockerHostById.mockResolvedValue(undefined);
    await expect(CreateUpdateDockerHost({ name: "new", connection_type: "tls", daemon: "host:2376" })).rejects.toThrow(
      "TLS connections require both a client certificate and a client key",
    );
    expect(dbMock.createDockerHost).not.toHaveBeenCalled();
  });

  it("rejects a duplicate name", async () => {
    dbMock.getDockerHostByName.mockResolvedValue({ ...TLS_HOST, id: 9 });
    await expect(
      CreateUpdateDockerHost({ name: "prod", connection_type: "socket", daemon: "/var/run/docker.sock" }),
    ).rejects.toThrow("A Docker host with this name already exists");
  });

  it("rejects an unknown connection type", async () => {
    await expect(
      CreateUpdateDockerHost({ name: "x", connection_type: "carrier-pigeon" as never, daemon: "/x" }),
    ).rejects.toThrow("Connection type must be one of: socket, tcp, tls");
  });
});

describe("testing a connection", () => {
  it("tests an edited TLS host against the stored certificate and key", async () => {
    getVersion.mockResolvedValue({
      data: { Version: "27.1.1", ApiVersion: "1.46", Os: "linux", Arch: "arm64" },
      latency: 4,
    });
    listContainers.mockResolvedValue({ data: [{}, {}], latency: 2 });

    const result = await TestDockerHost({
      id: 1,
      name: "prod",
      connection_type: "tls",
      daemon: "docker.example.com:2376",
      tls_cert: null,
      tls_key: null,
    });

    expect(result).toMatchObject({ success: true, version: "27.1.1", containerCount: 2 });
    expect(getVersion).toHaveBeenCalledWith(
      expect.objectContaining({ tls_cert: "STORED-CERT", tls_key: "STORED-KEY" }),
    );
  });

  it("still reports success when the daemon blocks /containers", async () => {
    getVersion.mockResolvedValue({
      data: { Version: "27.1.1", ApiVersion: "1.46", Os: "linux", Arch: "arm64" },
      latency: 4,
    });
    listContainers.mockRejectedValue(new Error("forbidden"));

    const result = await TestDockerHost({ id: 1 });
    expect(result.success).toBe(true);
    expect(result.containerCount).toBeUndefined();
  });

  it("returns the failure message instead of throwing", async () => {
    getVersion.mockRejectedValue(new Error("Connection refused by the Docker daemon"));
    await expect(TestDockerHost({ id: 1 })).resolves.toMatchObject({
      success: false,
      error: "Connection refused by the Docker daemon",
    });
  });
});

describe("view serialization", () => {
  it("hides the client certificate and key but returns the CA", async () => {
    dbMock.getDockerHosts.mockResolvedValue([TLS_HOST]);
    const [view] = await GetDockerHosts();

    expect(view).not.toHaveProperty("tls_cert");
    expect(view).not.toHaveProperty("tls_key");
    expect(view.tls_ca).toBe("STORED-CA");
    expect(view.has_tls_cert).toBe(true);
    expect(view.has_tls_key).toBe(true);
  });
});
