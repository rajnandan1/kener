import http from "http";
import https from "https";
import type { ProxyEnv } from "http";
import type { AxiosRequestConfig } from "axios";

// Node's own --use-env-proxy startup check looks at exactly these four.
const PROXY_VARS = ["HTTPS_PROXY", "HTTP_PROXY", "https_proxy", "http_proxy"] as const;

// The production process loads two bundles (esbuild main.js and the SvelteKit server) that each
// carry a copy of this module, so a module-level flag cannot make "once per process" true.
// A well-known symbol on globalThis can.
const INSTALLED = Symbol.for("kener.envProxyInstalled");

type SetGlobalProxyFromEnv = (env: NodeJS.ProcessEnv) => () => void;

/**
 * Route global `fetch` and the global http/https agents through HTTP_PROXY / HTTPS_PROXY /
 * NO_PROXY. Call after dotenv has populated `process.env`. No-op when no proxy variable is
 * set, or when this process already did it. Returns Node's restore function otherwise.
 *
 * Custom `https.Agent`s (the monitor services) never inherit this; they pass `proxyEnv`
 * themselves via `ProxyEnvFor`.
 */
export function InstallEnvProxy(env: NodeJS.ProcessEnv = process.env): (() => void) | undefined {
  const g = globalThis as { [INSTALLED]?: boolean };
  if (g[INSTALLED]) return undefined;
  if (!PROXY_VARS.some((k) => !!env[k])) return undefined;

  // Node >= 24.14.0; @types/node does not declare it yet.
  const setGlobalProxyFromEnv = (http as unknown as { setGlobalProxyFromEnv?: SetGlobalProxyFromEnv })
    .setGlobalProxyFromEnv;
  if (typeof setGlobalProxyFromEnv !== "function") {
    throw new Error(
      `HTTP_PROXY/HTTPS_PROXY is set but this Node (${process.version}) has no http.setGlobalProxyFromEnv; Kener needs Node >= 24.14.0`,
    );
  }
  const restore = setGlobalProxyFromEnv(env);
  g[INSTALLED] = true;
  return () => {
    restore();
    g[INSTALLED] = false;
  };
}

/**
 * The `proxyEnv` for a monitor's agents. The monitor's own proxy wins outright when set;
 * otherwise the process env, from which Node reads only HTTP_PROXY / HTTPS_PROXY / NO_PROXY.
 * NO_PROXY therefore applies to the env path only: a monitor that must bypass the env proxy
 * is a NO_PROXY entry, not a special value here.
 */
function ProxyEnvFor(proxy: string | undefined): ProxyEnv {
  const p = proxy?.trim();
  return p ? { HTTPS_PROXY: p, HTTP_PROXY: p } : process.env;
}

/**
 * The axios options that make one request honour the proxy. axios's own env-proxy code sends
 * https URLs to the proxy in plaintext (no CONNECT) and, for an http:// proxy, drops httpsAgent;
 * so it is switched off and both Node agents carry `proxyEnv` instead. `agent` options go on
 * both agents, `tls` options on the https one only.
 */
export function AxiosProxyConfig(
  proxy: string | undefined,
  agent: http.AgentOptions = {},
  tls: https.AgentOptions = {},
): Pick<AxiosRequestConfig, "proxy" | "httpAgent" | "httpsAgent"> {
  const proxyEnv = ProxyEnvFor(proxy);
  return {
    proxy: false,
    httpAgent: new http.Agent({ ...agent, proxyEnv }),
    httpsAgent: new https.Agent({ ...agent, ...tls, proxyEnv }),
  };
}
