import { afterEach, describe, expect, it } from "vitest";
import http from "http";
import https from "https";
import { AxiosProxyConfig, InstallEnvProxy } from "./proxy";

describe("AxiosProxyConfig", () => {
  it("switches axios's own proxy off and puts the monitor's proxy on both agents, no NO_PROXY key", () => {
    const c = AxiosProxyConfig(" http://user:pw@proxy.internal:3128 ");
    expect(c.proxy).toBe(false);
    const expected = {
      HTTPS_PROXY: "http://user:pw@proxy.internal:3128",
      HTTP_PROXY: "http://user:pw@proxy.internal:3128",
    };
    expect(c.httpAgent.options.proxyEnv).toEqual(expected);
    expect(c.httpsAgent.options.proxyEnv).toEqual(expected);
    expect("NO_PROXY" in c.httpsAgent.options.proxyEnv).toBe(false);
  });

  it("falls back to the process env when the monitor has no proxy", () => {
    for (const proxy of [undefined, "", "   "]) {
      expect(AxiosProxyConfig(proxy).httpsAgent.options.proxyEnv).toBe(process.env);
    }
  });

  it("applies agent options to both agents and tls options to the https one only", () => {
    const c = AxiosProxyConfig("http://p:3128", { keepAlive: true }, { rejectUnauthorized: false });
    expect(c.httpAgent.options.keepAlive).toBe(true);
    expect(c.httpsAgent.options.keepAlive).toBe(true);
    expect(c.httpsAgent.options.rejectUnauthorized).toBe(false);
    expect("rejectUnauthorized" in c.httpAgent.options).toBe(false);
  });
});

describe("InstallEnvProxy", () => {
  let restore: (() => void) | undefined;
  afterEach(() => {
    restore?.();
    restore = undefined;
  });

  it("is a no-op when no proxy variable is set", () => {
    const before = https.globalAgent;
    expect(InstallEnvProxy({})).toBeUndefined();
    expect(https.globalAgent).toBe(before);
  });

  it("installs once per process (swaps the global agents) and hands back a restore function", () => {
    const [httpBefore, httpsBefore] = [http.globalAgent, https.globalAgent];
    // Node swaps each global agent only when its own scheme has a proxy variable.
    restore = InstallEnvProxy({ HTTPS_PROXY: "http://127.0.0.1:9", HTTP_PROXY: "http://127.0.0.1:9" });
    expect(typeof restore).toBe("function");
    expect(https.globalAgent).not.toBe(httpsBefore);
    expect(http.globalAgent).not.toBe(httpBefore);
    // second call in the same process: already installed
    expect(InstallEnvProxy({ HTTPS_PROXY: "http://127.0.0.1:9" })).toBeUndefined();
    restore?.();
    restore = undefined;
    expect(https.globalAgent).toBe(httpsBefore);
    expect(http.globalAgent).toBe(httpBefore);
  });

  it("reads the lowercase spelling too", () => {
    restore = InstallEnvProxy({ https_proxy: "http://127.0.0.1:9" });
    expect(typeof restore).toBe("function");
  });
});
