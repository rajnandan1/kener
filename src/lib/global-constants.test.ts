import { describe, expect, it } from "vitest";
import { isMonitoringStatus } from "./global-constants.js";

describe("isMonitoringStatus", () => {
  it("accepts only statuses supported by the monitoring filter", () => {
    expect(isMonitoringStatus("UP")).toBe(true);
    expect(isMonitoringStatus("DOWN")).toBe(true);
    expect(isMonitoringStatus("DEGRADED")).toBe(true);
    expect(isMonitoringStatus("MAINTENANCE")).toBe(false);
    expect(isMonitoringStatus("invalid")).toBe(false);
  });
});
