import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import MonitorBar from "./MonitorBar.svelte";
import type { MonitorBarResponse } from "$lib/server/api-server/monitor-bar/get";

describe("MonitorBar", () => {
  const prefetchedData: MonitorBarResponse = {
    name: "API Server",
    description: "",
    image: null,
    currentStatus: "UP",
    uptime: "100",
    avgLatency: "10",
    uptimeData: [],
    fromTimeStamp: 0,
    toTimeStamp: 0,
    maxLatency: "10",
    minLatency: "10",
  };

  it("default renders a link", async () => {
    const screen = await render(MonitorBar, { tag: "api", prefetchedData });
    const link = screen.getByRole("link", { name: "API Server" });
    await expect.element(link).toBeInTheDocument();
    expect(link.element().getAttribute("href")).toMatch(/\/monitors\/api$/);
  });

  it("with link:false renders no link", async () => {
    const screen = await render(MonitorBar, { tag: "api", link: false, prefetchedData });
    await expect.element(screen.getByText("API Server")).toBeInTheDocument();
    await expect.element(screen.getByRole("link", { name: "API Server" })).not.toBeInTheDocument();
  });
});
