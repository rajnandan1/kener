import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DockerContainerState } from "../docker";
import type { DockerMonitor, DockerMonitorTypeData } from "../types/monitor";

const { getDockerHostById, inspectContainer, pingDaemon } = vi.hoisted(() => ({
  getDockerHostById: vi.fn(),
  inspectContainer: vi.fn(),
  pingDaemon: vi.fn(),
}));

vi.mock("../db/db.js", () => ({ default: { getDockerHostById } }));
vi.mock("../docker.js", async (importOriginal) => {
  // Keep the real DockerError so `instanceof` narrowing in dockerCall is exercised.
  const actual = await importOriginal<typeof import("../docker")>();
  return { ...actual, inspectContainer, pingDaemon };
});

const { DockerError } = await import("../docker");
const DockerCall = (await import("./dockerCall")).default;

const HOST = { id: 1, name: "prod", connection_type: "socket", daemon: "/var/run/docker.sock" };

function state(overrides: Partial<DockerContainerState>): DockerContainerState {
  return {
    Status: "running",
    Running: true,
    Paused: false,
    Restarting: false,
    Dead: false,
    ExitCode: 0,
    StartedAt: "",
    FinishedAt: "",
    ...overrides,
  };
}

function run(typeData: Partial<DockerMonitorTypeData>) {
  const monitor = {
    tag: "web",
    type_data: { dockerHostId: 1, checkType: "container", containerName: "app", ...typeData },
  } as unknown as DockerMonitor;
  return new DockerCall(monitor).execute();
}

function respondWith(containerState: DockerContainerState, latency = 7) {
  inspectContainer.mockResolvedValue({ data: { Id: "abc", Name: "/app", State: containerState }, latency });
}

beforeEach(() => {
  vi.clearAllMocks();
  getDockerHostById.mockResolvedValue(HOST);
});

describe("container status mapping", () => {
  it("is UP when running without a healthcheck", async () => {
    respondWith(state({}));
    await expect(run({})).resolves.toMatchObject({ status: "UP", latency: 7, type: "REALTIME" });
  });

  it("is UP when the healthcheck reports healthy", async () => {
    respondWith(state({ Health: { Status: "healthy", FailingStreak: 0 } }));
    await expect(run({})).resolves.toMatchObject({ status: "UP" });
  });

  it("is DEGRADED while the healthcheck is still starting", async () => {
    respondWith(state({ Health: { Status: "starting", FailingStreak: 0 } }));
    await expect(run({})).resolves.toMatchObject({
      status: "DEGRADED",
      error_message: "Container healthcheck is still starting",
    });
  });

  it("defaults an unhealthy container to DOWN and surfaces the last probe output", async () => {
    respondWith(
      state({
        Health: { Status: "unhealthy", FailingStreak: 3, Log: [{ ExitCode: 1, Output: "connection refused\n" }] },
      }),
    );
    const result = await run({});
    expect(result.status).toBe("DOWN");
    expect(result.error_message).toBe("Container healthcheck is unhealthy after 3 failures: connection refused");
  });

  it("honours unhealthyStatus when set to DEGRADED", async () => {
    respondWith(state({ Health: { Status: "unhealthy", FailingStreak: 1 } }));
    await expect(run({ unhealthyStatus: "DEGRADED" })).resolves.toMatchObject({ status: "DEGRADED" });
  });

  it("truncates a very long healthcheck output", async () => {
    respondWith(
      state({ Health: { Status: "unhealthy", FailingStreak: 1, Log: [{ ExitCode: 1, Output: "x".repeat(500) }] } }),
    );
    const result = await run({});
    expect(result.error_message).toContain(`${"x".repeat(200)}...`);
    expect(result.error_message!.length).toBeLessThan(300);
  });

  it("defaults a restarting container to DEGRADED and is overridable", async () => {
    respondWith(state({ Status: "restarting", Running: false, Restarting: true }));
    await expect(run({})).resolves.toMatchObject({ status: "DEGRADED", error_message: "Container is restarting" });
    await expect(run({ restartingStatus: "DOWN" })).resolves.toMatchObject({ status: "DOWN" });
  });

  it("defaults a paused container to DOWN and is overridable", async () => {
    respondWith(state({ Status: "paused", Paused: true }));
    await expect(run({})).resolves.toMatchObject({ status: "DOWN", error_message: "Container is paused" });
    await expect(run({ pausedStatus: "DEGRADED" })).resolves.toMatchObject({ status: "DEGRADED" });
  });

  it("reports the exit code for a stopped container", async () => {
    respondWith(state({ Status: "exited", Running: false, ExitCode: 137 }));
    await expect(run({})).resolves.toMatchObject({
      status: "DOWN",
      error_message: "Container is exited with exit code 137",
    });
  });

  it("includes the daemon's error text for a stopped container when present", async () => {
    respondWith(state({ Status: "dead", Running: false, ExitCode: 1, Error: "OOMKilled" }));
    const result = await run({});
    expect(result.error_message).toBe("Container is dead with exit code 1 (OOMKilled)");
  });

  it("prefers restarting over the health status", async () => {
    respondWith(state({ Restarting: true, Health: { Status: "unhealthy", FailingStreak: 9 } }));
    await expect(run({})).resolves.toMatchObject({ status: "DEGRADED", error_message: "Container is restarting" });
  });
});

describe("daemon checks", () => {
  it("is UP when the daemon answers /_ping", async () => {
    pingDaemon.mockResolvedValue({ data: "OK", latency: 3 });
    await expect(run({ checkType: "daemon" })).resolves.toMatchObject({ status: "UP", latency: 3 });
    expect(inspectContainer).not.toHaveBeenCalled();
  });

  it("does not require a container name", async () => {
    pingDaemon.mockResolvedValue({ data: "OK", latency: 1 });
    await expect(run({ checkType: "daemon", containerName: "" })).resolves.toMatchObject({ status: "UP" });
  });
});

describe("error handling", () => {
  it("distinguishes a missing container from an unreachable daemon", async () => {
    inspectContainer.mockRejectedValue(new DockerError("No such container: ghost", { statusCode: 404 }));
    await expect(run({ containerName: "ghost" })).resolves.toMatchObject({
      status: "DOWN",
      type: "ERROR",
      error_message: 'Container "ghost" not found on prod',
    });
  });

  it("marks a timeout with the TIMEOUT type", async () => {
    inspectContainer.mockRejectedValue(
      new DockerError("Docker API request timed out after 10000ms", { isTimeout: true }),
    );
    await expect(run({})).resolves.toMatchObject({ status: "DOWN", type: "TIMEOUT" });
  });

  it("passes through the daemon's message for other transport errors", async () => {
    inspectContainer.mockRejectedValue(new DockerError("Connection refused by the Docker daemon"));
    await expect(run({})).resolves.toMatchObject({
      status: "DOWN",
      type: "ERROR",
      error_message: "Connection refused by the Docker daemon",
    });
  });

  it("is DOWN with a reason when no Docker host is selected", async () => {
    await expect(run({ dockerHostId: undefined })).resolves.toMatchObject({
      status: "DOWN",
      error_message: "No Docker host selected for monitor web",
    });
    expect(getDockerHostById).not.toHaveBeenCalled();
  });

  it("is DOWN with a reason when the referenced host was deleted", async () => {
    getDockerHostById.mockResolvedValue(undefined);
    await expect(run({})).resolves.toMatchObject({
      status: "DOWN",
      error_message: "Docker host 1 no longer exists",
    });
  });

  it("is DOWN with a reason when no container is configured", async () => {
    await expect(run({ containerName: "   " })).resolves.toMatchObject({
      status: "DOWN",
      error_message: "No container configured for monitor web",
    });
    expect(inspectContainer).not.toHaveBeenCalled();
  });
});
