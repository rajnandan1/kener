import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DockerContainerState } from "../docker";
import type { DockerMonitor } from "../types/monitor";
import type { DockerMonitorTypeData } from "../../types/docker";

const { inspectContainer, pingDaemon } = vi.hoisted(() => ({
  inspectContainer: vi.fn(),
  pingDaemon: vi.fn(),
}));

vi.mock("../docker.js", async (importOriginal) => {
  // Keep the real DockerError and resolveConnection so narrowing and $SECRET handling are exercised.
  const actual = await importOriginal<typeof import("../docker")>();
  return { ...actual, inspectContainer, pingDaemon };
});

const { DockerError } = await import("../docker");
const DockerCall = (await import("./dockerCall")).default;

const CONNECTION = { connectionType: "socket", daemon: "/var/run/docker.sock" } as const;

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
    type_data: { ...CONNECTION, checkType: "container", containerName: "app", ...typeData },
  } as unknown as DockerMonitor;
  return new DockerCall(monitor).execute();
}

function respondWith(containerState: DockerContainerState, latency = 7) {
  inspectContainer.mockResolvedValue({ data: { Id: "abc", Name: "/app", State: containerState }, latency });
}

beforeEach(() => {
  vi.clearAllMocks();
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

  it("is DOWN when unhealthy and surfaces the last probe output", async () => {
    respondWith(
      state({
        Health: { Status: "unhealthy", FailingStreak: 3, Log: [{ ExitCode: 1, Output: "connection refused\n" }] },
      }),
    );
    const result = await run({});
    expect(result.status).toBe("DOWN");
    expect(result.error_message).toBe("Container healthcheck is unhealthy after 3 failures: connection refused");
  });

  it("truncates a very long healthcheck output", async () => {
    respondWith(
      state({ Health: { Status: "unhealthy", FailingStreak: 1, Log: [{ ExitCode: 1, Output: "x".repeat(500) }] } }),
    );
    const result = await run({});
    expect(result.error_message).toContain(`${"x".repeat(200)}...`);
    expect(result.error_message!.length).toBeLessThan(300);
  });

  it("is DEGRADED while restarting", async () => {
    respondWith(state({ Status: "restarting", Running: true, Restarting: true }));
    await expect(run({})).resolves.toMatchObject({ status: "DEGRADED", error_message: "Container is restarting" });
  });

  it("is DOWN when paused", async () => {
    respondWith(state({ Status: "paused", Paused: true }));
    await expect(run({})).resolves.toMatchObject({ status: "DOWN", error_message: "Container is paused" });
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

  it("is DOWN when /_ping answers with something other than OK", async () => {
    pingDaemon.mockResolvedValue({ data: "<html>login</html>", latency: 2 });
    await expect(run({ checkType: "daemon" })).resolves.toMatchObject({
      status: "DOWN",
      type: "ERROR",
      error_message: "Docker daemon returned an unexpected /_ping response",
    });
  });

  it("keeps the daemon's own message on a 404 instead of a missing-container message", async () => {
    pingDaemon.mockRejectedValue(new DockerError("page not found", { statusCode: 404 }));
    await expect(run({ checkType: "daemon" })).resolves.toMatchObject({
      status: "DOWN",
      type: "ERROR",
      error_message: "page not found",
    });
  });
});

describe("connection", () => {
  afterEach(() => {
    delete process.env.KENER_TEST_DOCKER_SOCK;
  });

  it("resolves $SECRET references before calling the daemon", async () => {
    process.env.KENER_TEST_DOCKER_SOCK = "/tmp/docker.sock";
    respondWith(state({}));
    await run({ daemon: "$KENER_TEST_DOCKER_SOCK" });
    expect(inspectContainer).toHaveBeenCalledWith(
      expect.objectContaining({ connectionType: "socket", daemon: "/tmp/docker.sock" }),
      "app",
      10000,
    );
  });

  it("is DOWN with a reason when the connection type is unknown", async () => {
    await expect(run({ connectionType: "ssh" as never })).resolves.toMatchObject({
      status: "DOWN",
      type: "ERROR",
      error_message: "Docker connection type must be one of: socket, tcp, tls",
    });
    expect(inspectContainer).not.toHaveBeenCalled();
  });

  it("is DOWN with a reason when no container is configured", async () => {
    await expect(run({ containerName: "   " })).resolves.toMatchObject({
      status: "DOWN",
      error_message: "No container configured for monitor web",
    });
    expect(inspectContainer).not.toHaveBeenCalled();
  });
});

describe("error handling", () => {
  it("distinguishes a missing container from an unreachable daemon", async () => {
    inspectContainer.mockRejectedValue(new DockerError("No such container: ghost", { statusCode: 404 }));
    await expect(run({ containerName: "ghost" })).resolves.toMatchObject({
      status: "DOWN",
      type: "ERROR",
      error_message: 'Container "ghost" not found on /var/run/docker.sock',
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
});
