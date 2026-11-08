import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import { page as browserPage } from "vitest/browser";
import type { GroupMonitorTypeData } from "$lib/server/types/monitor";
import MonitorGroup from "./monitor-group.svelte";

describe("monitor-group form", () => {
  it("stores the Member Display the user picks", async () => {
    const data = $state({
      monitors: [],
      executionDelay: 1000,
      latencyCalculation: "AVG",
      memberDisplay: "DRAWER",
    } as GroupMonitorTypeData);
    const screen = await render(MonitorGroup, { data, availableMonitors: [], tag: "group" });

    await screen.getByLabelText("Member Display").click();
    await browserPage.getByRole("option", { name: "Inline" }).click();

    expect(data.memberDisplay).toBe("INLINE");
  });
});
