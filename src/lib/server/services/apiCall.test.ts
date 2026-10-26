import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import ApiCall from "./apiCall";
import type { ApiMonitor } from "../types/monitor";

vi.mock("axios", () => ({ default: vi.fn() }));
const mockedAxios = vi.mocked(axios);

beforeEach(() => {
  mockedAxios.mockReset();
  mockedAxios.mockResolvedValue({ status: 200, data: "ok" });
});

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

describe("ApiCall proxy", () => {
  const withEnv = (key: string, value: string) => {
    const prev = process.env[key];
    process.env[key] = value;
    return () => {
      if (prev === undefined) delete process.env[key];
      else process.env[key] = prev;
    };
  };
  let restoreEnv: (() => void) | undefined;
  afterEach(() => {
    restoreEnv?.();
    restoreEnv = undefined;
  });

  const monitor = (overrides: Partial<NonNullable<ApiMonitor["type_data"]>> = {}): ApiMonitor =>
    ({
      tag: "api-proxy",
      type_data: { url: "https://example.com/health", method: "GET", ...overrides },
    }) as ApiMonitor;

  // axios's own env-proxy code never CONNECT-tunnels and drops httpsAgent for http:// proxies,
  // so every call must opt out of it and let Node's agents do the proxying.
  const optionsOfLastCall = () => mockedAxios.mock.calls[0][1] as Record<string, any>;

  it("routes through the monitor's own proxy, with $SECRET substituted, on both agents", async () => {
    restoreEnv = withEnv("PROXY_PASS", "pw");
    await new ApiCall(monitor({ proxy: "http://user:$PROXY_PASS@proxy.internal:3128" })).execute();
    const o = optionsOfLastCall();
    expect(o.proxy).toBe(false);
    const expected = {
      HTTPS_PROXY: "http://user:pw@proxy.internal:3128",
      HTTP_PROXY: "http://user:pw@proxy.internal:3128",
    };
    expect(o.httpsAgent.options.proxyEnv).toEqual(expected);
    expect(o.httpAgent.options.proxyEnv).toEqual(expected);
  });

  it("falls back to the process env (HTTP_PROXY / HTTPS_PROXY / NO_PROXY) without a monitor proxy", async () => {
    await new ApiCall(monitor()).execute();
    const o = optionsOfLastCall();
    expect(o.proxy).toBe(false);
    expect(o.httpsAgent.options.proxyEnv).toBe(process.env);
    expect(o.httpAgent.options.proxyEnv).toBe(process.env);
  });

  it("keeps allowSelfSignedCert on the https agent", async () => {
    await new ApiCall(monitor({ allowSelfSignedCert: true, proxy: "http://proxy.internal:3128" })).execute();
    expect(optionsOfLastCall().httpsAgent.options.rejectUnauthorized).toBe(false);
  });
});
