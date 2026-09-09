import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("$lib/server/db/db", () => ({
  default: {
    insertMonitor: vi.fn().mockResolvedValue([1]),
    updateMonitor: vi.fn().mockResolvedValue(1),
  },
}));

import db from "$lib/server/db/db";
import { CreateMonitor, CreateUpdateMonitor } from "./monitorsController";

const mockedDb = vi.mocked(db);

const apiMonitor = (typeData: Record<string, unknown>, id?: number) => ({
  id,
  tag: "api-proxy",
  name: "API proxy",
  monitor_type: "API",
  type_data: JSON.stringify({ url: "https://example.com", method: "GET", ...typeData }),
});

beforeEach(() => {
  mockedDb.insertMonitor.mockClear();
  mockedDb.updateMonitor.mockClear();
});

describe("monitor save: type_data.proxy scheme check", () => {
  // Node silently ignores a proxy URL that is not http(s)://, so a typo would run the check
  // unproxied and look UP. Save is the only place a typo can be caught.
  const rejection = "Proxy URL must be a valid http:// or https:// URL";

  it("rejects a non-http(s) proxy on create", async () => {
    await expect(CreateUpdateMonitor(apiMonitor({ proxy: "socks5://proxy:1080" }))).rejects.toThrow(rejection);
    await expect(CreateMonitor(apiMonitor({ proxy: "proxy.internal:3128" }))).rejects.toThrow(rejection);
    // Node's proxyEnv parser only recognises lowercase schemes; "HTTP://" would save and run direct.
    await expect(CreateMonitor(apiMonitor({ proxy: "HTTPS://proxy.internal:3128" }))).rejects.toThrow(rejection);
    expect(mockedDb.insertMonitor).not.toHaveBeenCalled();
  });

  it("rejects it on update too", async () => {
    await expect(CreateUpdateMonitor(apiMonitor({ proxy: "ftp://proxy" }, 7))).rejects.toThrow(rejection);
    expect(mockedDb.updateMonitor).not.toHaveBeenCalled();
  });

  it("accepts http(s) proxies, including $SECRET credentials, and no proxy at all", async () => {
    await CreateUpdateMonitor(apiMonitor({ proxy: "http://user:$PROXY_PASS@proxy.internal:3128" }));
    await CreateUpdateMonitor(apiMonitor({ proxy: "https://proxy.internal:3128" }));
    await CreateUpdateMonitor(apiMonitor({ proxy: "" }));
    await CreateUpdateMonitor(apiMonitor({}));
    expect(mockedDb.insertMonitor).toHaveBeenCalledTimes(4);
  });

  it("rejects a malformed authority the URL parser cannot take", async () => {
    // Node throws ERR_PROXY_INVALID_CONFIG on these while building the agents, which would
    // fail the check itself rather than the save.
    for (const proxy of ["http://proxy:abc", "http://:3128", "http://proxy:99999", "http://[::1"]) {
      await expect(CreateMonitor(apiMonitor({ proxy }))).rejects.toThrow(rejection);
    }
    expect(mockedDb.insertMonitor).not.toHaveBeenCalled();
  });

  it("rejects a proxy that is not a string at all", async () => {
    // type_data is parsed JSON: the API can hand us any shape here.
    for (const proxy of [{}, 3128, true, ["http://proxy:3128"]]) {
      await expect(CreateMonitor(apiMonitor({ proxy }))).rejects.toThrow(rejection);
    }
    expect(mockedDb.insertMonitor).not.toHaveBeenCalled();
  });

  it("leaves monitors without parseable type_data alone", async () => {
    await CreateUpdateMonitor({ tag: "none", name: "None", monitor_type: "NONE", type_data: null });
    await CreateUpdateMonitor({ tag: "bad", name: "Bad", monitor_type: "API", type_data: "{not json" });
    expect(mockedDb.insertMonitor).toHaveBeenCalledTimes(2);
  });
});
