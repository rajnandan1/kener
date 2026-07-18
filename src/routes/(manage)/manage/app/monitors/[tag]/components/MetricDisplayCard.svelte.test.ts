import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import MetricDisplayCard from "./MetricDisplayCard.svelte";
import type { MonitorRecord } from "$lib/server/types/db";

// Minimal monitor fixture: only the fields MetricDisplayCard's Props require.
const monitor: MonitorRecord = {
  id: 1,
  tag: "test-monitor",
  name: "Test Monitor",
  description: null,
  image: null,
  cron: "* * * * *",
  default_status: "UP",
  status: "ACTIVE",
  category_name: "Home",
  monitor_type: "API",
  is_hidden: "NO",
  monitor_settings_json: null,
};

const saveButtonName = /Save Metric Display Settings/i;

describe("MetricDisplayCard", () => {
  // Svelte 5 number inputs bind `null` (not `undefined`) when the field is emptied,
  // so decimals: null must be treated as "unset" rather than invalid.
  it("does not disable Save when decimals is cleared (null)", async () => {
    const valueDisplayForm = { name: "", unit: "", decimals: null as number | null | undefined };

    const screen = await render(MetricDisplayCard, {
      monitor: { ...monitor },
      typeData: {},
      valueDisplayForm,
    });

    await expect.element(screen.getByRole("button", { name: saveButtonName })).toBeEnabled();
  });

  it("disables Save when decimals is out of the 0-4 range", async () => {
    const valueDisplayForm = { name: "", unit: "", decimals: 7 as number | null | undefined };

    const screen = await render(MetricDisplayCard, {
      monitor: { ...monitor },
      typeData: {},
      valueDisplayForm,
    });

    await expect.element(screen.getByRole("button", { name: saveButtonName })).toBeDisabled();
  });
});
