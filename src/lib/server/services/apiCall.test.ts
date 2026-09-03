import { describe, it, expect } from "vitest";
import ApiCall from "./apiCall";
import type { ApiMonitor } from "../types/monitor";

describe("ApiCall.execute", () => {
  it("does not throw in the constructor and records ERROR when type_data is null", async () => {
    // The worker constructs the service before calling execute(), so the
    // constructor must survive a malformed (null type_data) monitor and
    // execute() must record a result instead of leaving a gap in the timeline.
    const monitor = { tag: "api-test", type_data: null } as unknown as ApiMonitor;
    const r = await new ApiCall(monitor).execute();
    expect(r.status).toBe("DOWN");
    expect(r.type).toBe("ERROR");
    expect(r.error_message).toBe("API monitor is missing configuration");
  });
});
