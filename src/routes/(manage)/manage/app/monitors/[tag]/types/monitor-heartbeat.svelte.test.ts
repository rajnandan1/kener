import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import { HEARTBEAT_SECRET_RULE } from "$lib/anywhere";
import type { HeartbeatMonitorTypeData } from "$lib/server/types/monitor";
import MonitorHeartbeat from "./monitor-heartbeat.svelte";

describe("monitor-heartbeat form", () => {
  it("builds the heartbeat URL from the typed heartbeat secret", async () => {
    const data = $state({ secretString: "old-secret-value" } as HeartbeatMonitorTypeData);
    const screen = await render(MonitorHeartbeat, { data, tag: "hb-mon" });

    await screen.getByLabelText("Heartbeat secret").fill("my-alertmanager-hb-01");

    await expect
      .element(screen.getByLabelText("Heartbeat URL"))
      .toHaveValue(`${window.location.origin}/ext/heartbeat/hb-mon/my-alertmanager-hb-01`);
    await expect.element(screen.getByLabelText("Heartbeat secret")).toBeValid();
    expect(data.secretString).toBe("my-alertmanager-hb-01");
  });

  it("marks a secret that breaks the rule as invalid", async () => {
    const data = $state({ secretString: "my-alertmanager-hb-01" } as HeartbeatMonitorTypeData);
    const screen = await render(MonitorHeartbeat, { data, tag: "hb-mon" });

    await expect.element(screen.getByText(HEARTBEAT_SECRET_RULE)).toBeVisible();

    await screen.getByLabelText("Heartbeat secret").fill("a/b?c");
    await expect.element(screen.getByLabelText("Heartbeat secret")).toBeInvalid();

    await screen.getByLabelText("Heartbeat secret").fill("abcdefghijk");
    await expect.element(screen.getByLabelText("Heartbeat secret")).toBeInvalid();

    await screen.getByLabelText("Heartbeat secret").fill("abcdefghijkl");
    await expect.element(screen.getByLabelText("Heartbeat secret")).toBeValid();
  });

  it("accepts the stored secret while unchanged, even one the rule would reject", async () => {
    const data = $state({ secretString: "ab" } as HeartbeatMonitorTypeData);
    const screen = await render(MonitorHeartbeat, { data, tag: "hb-mon" });
    const input = screen.getByLabelText("Heartbeat secret");

    await expect.element(input).toBeValid();

    await input.fill("abc");
    await expect.element(input).toBeInvalid();

    await input.fill("ab");
    await expect.element(input).toBeValid();
  });

  it("generates a secret once on load and lets the user clear it", async () => {
    const data = $state({} as HeartbeatMonitorTypeData);
    const screen = await render(MonitorHeartbeat, { data, tag: "hb-mon" });

    const generated = data.secretString;
    expect(generated).toMatch(/^[A-Za-z0-9._~-]{12,}$/);
    await expect.element(screen.getByLabelText("Heartbeat secret")).toHaveValue(generated);

    await screen.getByLabelText("Heartbeat secret").clear();

    await expect.element(screen.getByLabelText("Heartbeat secret")).toHaveValue("");
    await expect.element(screen.getByLabelText("Heartbeat secret")).toBeInvalid();
    expect(data.secretString).toBe("");
  });
});
