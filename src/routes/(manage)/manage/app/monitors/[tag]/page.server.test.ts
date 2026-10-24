import { afterEach, describe, expect, it, vi } from "vitest";

async function loadPageData(): Promise<string> {
  const { load } = await import("./+page.server.js");
  return JSON.stringify(await load({} as never));
}

describe("monitor editor page data", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("sends the Docker defaults and no other environment value", async () => {
    vi.stubEnv("DOCKER_HOST", "tcp://localhost:2375");
    vi.stubEnv("KENER_SECRET_KEY", "kener-851-secret-sentinel");

    const body = await loadPageData();

    expect(JSON.parse(body)).toEqual({ dockerDefaults: { connectionType: "tcp", daemon: "localhost:2375" } });
    expect(body).not.toContain("kener-851-secret-sentinel");
  });

  it("warns once per process for an unsupported DOCKER_HOST", async () => {
    vi.stubEnv("DOCKER_HOST", "ssh://me@docker.example.com");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { load } = await import("./+page.server.js");
    await load({} as never);
    await load({} as never);

    expect(warn).toHaveBeenCalledTimes(1);
  });
});
