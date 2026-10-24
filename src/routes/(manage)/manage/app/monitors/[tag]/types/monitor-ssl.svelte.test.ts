import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import type { SslMonitorTypeData } from "$lib/server/types/monitor";
import MonitorSsl from "./monitor-ssl.svelte";

describe("monitor-ssl form", () => {
  it("keeps a saved DOWN threshold of 0 when the editor reopens", async () => {
    const data = $state({
      host: "example.com",
      degradedRemainingHours: 168,
      downRemainingHours: 0,
    } as SslMonitorTypeData);
    const screen = await render(MonitorSsl, { data });

    expect(screen.container.querySelector<HTMLInputElement>("#ssl-down")?.value).toBe("0");
    expect(data.downRemainingHours).toBe(0);
  });

  it("fills the defaults for a new monitor", async () => {
    const data = $state({} as SslMonitorTypeData);
    await render(MonitorSsl, { data });

    expect(data).toMatchObject({ port: "443", degradedRemainingHours: 168, downRemainingHours: 24, timeout: 10000 });
  });
});
