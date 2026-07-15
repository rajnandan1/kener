import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import MonitorBar from "./MonitorBar.svelte";
import type { MonitorBarResponse } from "$lib/server/api-server/monitor-bar/get";

const baseData: MonitorBarResponse = {
  name: "Test Monitor",
  description: "",
  image: null,
  currentStatus: "UP",
  uptime: "99.9",
  avgLatency: "250ms",
  minLatency: "10ms",
  maxLatency: "900ms",
  currentLatency: "123ms",
  uptimeData: [],
  fromTimeStamp: 1768478400,
  toTimeStamp: 1768564799,
};

// compact=true renders the latency block but skips the calendar/date block,
// keeping the test independent of the page/date-format stores.
describe("MonitorBar latency display", () => {
  it("shows avg only by default", async () => {
    const screen = await render(MonitorBar, { tag: "test", prefetchedData: baseData, compact: true });
    await expect.element(screen.getByText("avg. 250ms")).toBeInTheDocument();
  });

  it("shows avg | min | max when all enabled", async () => {
    const screen = await render(MonitorBar, {
      tag: "test",
      prefetchedData: baseData,
      compact: true,
      latencyDisplay: { current: false, avg: true, min: true, max: true },
    });
    await expect.element(screen.getByText("avg. 250ms | min. 10ms | max. 900ms")).toBeInTheDocument();
  });

  it("shows current (now.) when enabled", async () => {
    const screen = await render(MonitorBar, {
      tag: "test",
      prefetchedData: baseData,
      compact: true,
      latencyDisplay: { current: true, avg: false, min: false, max: false },
    });
    await expect.element(screen.getByText("now. 123ms")).toBeInTheDocument();
  });

  it("renders no latency value when nothing is enabled", async () => {
    const screen = await render(MonitorBar, {
      tag: "test",
      prefetchedData: baseData,
      compact: true,
      latencyDisplay: { current: false, avg: false, min: false, max: false },
    });
    await expect.element(screen.getByText("250ms")).not.toBeInTheDocument();
  });
});
