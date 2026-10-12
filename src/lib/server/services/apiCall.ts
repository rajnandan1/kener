import axios, { type AxiosRequestConfig } from "axios";
import { GetRequiredSecrets, ReplaceAllOccurrences, ApplySecretsToHeaders } from "../tool.js";
import GC from "../../global-constants.js";
import * as cheerio from "cheerio";
import { DefaultAPIEval } from "../../anywhere.js";
import version from "../../version.js";
import { AxiosProxyConfig } from "../proxy.js";
import { performance } from "node:perf_hooks";
import type { ApiMonitor, EvalResponse, MonitoringResult } from "../types/monitor.js";
import { createSsrfSafeLookup, assertLiteralIpIsAllowed } from "../security/ssrfGuard.js";

// Caps a probe response at 20MB so a malicious or misbehaving target cannot grow the
// Node process's memory unbounded by streaming an arbitrarily large response back
// through a scheduled monitor check (CWE-770). 20MB comfortably covers any legitimate
// health-check/API response while still bounding worst case memory use per probe.
const MAX_RESPONSE_BYTES = 20 * 1024 * 1024;

class ApiCall {
  monitor: ApiMonitor;
  envSecrets: Array<{ find: string; replace: string | undefined }>;

  constructor(monitor: ApiMonitor) {
    this.monitor = monitor;
    // Read type_data defensively: a malformed monitor (missing type_data) must
    // be reported by execute() as an ERROR result, so the constructor must not
    // throw before execute() ever runs.
    const td = monitor.type_data;
    this.envSecrets = GetRequiredSecrets(
      `${td?.url ?? ""} ${td?.body || ""} ${td?.proxy ?? ""} ${JSON.stringify(td?.headers || [])}`,
    );
  }

  async execute(): Promise<MonitoringResult> {
    // Malformed config (missing type_data) must record a result, not throw out
    // of the worker and leave a gap in the timeline.
    if (!this.monitor.type_data) {
      return {
        status: GC.DOWN,
        latency: 0,
        type: GC.ERROR,
        error_message: "API monitor is missing configuration",
      };
    }

    let axiosHeaders: Record<string, string> = {};
    axiosHeaders["User-Agent"] = `Kener/${version()}`;
    axiosHeaders["Accept"] = "*/*";

    let body = this.monitor.type_data.body;
    let url = this.monitor.type_data.url;
    let proxy = this.monitor.type_data.proxy;

    let method = this.monitor.type_data.method;
    let timeout = this.monitor.type_data.timeout || 10000;

    let monitorEval = !!this.monitor.type_data.eval ? this.monitor.type_data.eval : DefaultAPIEval;

    for (let i = 0; i < this.envSecrets.length; i++) {
      const secret = this.envSecrets[i];
      if (secret.replace === undefined) continue;
      if (!!body) {
        body = ReplaceAllOccurrences(body, secret.find, secret.replace);
      }
      if (!!url) {
        url = ReplaceAllOccurrences(url, secret.find, secret.replace);
      }
      if (!!proxy) {
        proxy = ReplaceAllOccurrences(proxy, secret.find, secret.replace);
      }
    }

    // Substitute secrets into each header key/value individually - never into a
    // JSON blob, which a secret value could corrupt and drop the whole set.
    axiosHeaders = { ...axiosHeaders, ...ApplySecretsToHeaders(this.monitor.type_data.headers, this.envSecrets) };
    const followRedirects = this.monitor.type_data.follow_redirects ?? true;

    const maxRedirects = this.monitor.type_data.max_redirects ?? 5;

    // SSRF guard (CWE-918). A monitor's `url` and `proxy` are set by anyone who can
    // create/edit a monitor (including any ACTIVE API key, which carries no scoping -
    // see the API-key authorization fix), so both are treated as untrusted destinations,
    // not as config the operator necessarily meant to reach internal/private network space.
    try {
      const parsedUrl = new URL(url || "");
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        throw new Error(`URL scheme "${parsedUrl.protocol}" is not allowed; only http/https are permitted`);
      }
      // Covers the literal-IP case the `lookup` option below cannot see (Node skips
      // `lookup` entirely when the host is already an IP address).
      assertLiteralIpIsAllowed(parsedUrl.hostname.replace(/^\[|\]$/g, ""));
    } catch (e) {
      return {
        status: GC.DOWN,
        latency: 0,
        type: GC.ERROR,
        error_message: `Invalid monitor URL: ${(e as Error).message}`,
      };
    }

    // A monitor's own `proxy` is a deliberate egress choice (e.g. routing through a
    // corporate proxy that legitimately lives on a private address) made by whoever
    // configures the monitor, not treated as an SSRF target here - only the request's
    // actual destination (`url`, including redirects) is guarded below.
    const options: AxiosRequestConfig = {
      method: method,
      headers: axiosHeaders,
      timeout: timeout,
      transformResponse: (r: string) => r,
      maxRedirects: followRedirects ? maxRedirects : 0,
      validateStatus: () => true,
      maxContentLength: MAX_RESPONSE_BYTES,
      maxBodyLength: MAX_RESPONSE_BYTES,
      // Resolves the destination (and, since follow-redirects reuses these options on
      // every hop, each redirect target too) and refuses to connect if it lands on a
      // loopback/private/link-local/metadata/reserved address. Only guards the direct
      // connection; when a monitor proxy is configured the proxy host is validated above
      // instead, since that hop is dialed by a separate agent.
      lookup: createSsrfSafeLookup(),
      // `lookup` never runs when a hop's host is already a literal IP (Node bypasses
      // it for IP literals) - covers that case for every redirect hop. Thrown errors
      // here are caught by follow-redirects and surfaced as the request's rejection.
      beforeRedirect: (redirectOptions) => {
        if (redirectOptions.protocol !== "http:" && redirectOptions.protocol !== "https:") {
          throw new Error(`Redirect to disallowed URL scheme "${redirectOptions.protocol}"`);
        }
        assertLiteralIpIsAllowed(String(redirectOptions.hostname || "").replace(/^\[|\]$/g, ""));
      },
      ...AxiosProxyConfig(
        proxy,
        { keepAlive: true, keepAliveMsecs: 30000, maxSockets: 50, maxFreeSockets: 10, timeout },
        { rejectUnauthorized: !this.monitor.type_data.allowSelfSignedCert },
      ),
    };

    if (!!body) {
      options.data = body;
    }
    let statusCode = 500;
    let latency = 0;
    let errorMessage = "";
    let resp = "";
    let timeoutError = false;
    const start = performance.now();
    try {
      let data = await axios(url, options);
      statusCode = data.status;
      resp = data.data;
    } catch (err: unknown) {
      const error = err as {
        code?: string;
        message?: string;
        response?: { status?: number; data?: string };
      };
      errorMessage = error.message || "Unknown error";
      // Better timeout detection
      if (error.code === "ECONNABORTED" || (error.message && error.message.includes("timeout"))) {
        timeoutError = true;
        errorMessage = "Request timed out";
      }

      if (error.response?.status !== undefined) {
        statusCode = error.response.status;
      }
      if (error.response?.data !== undefined) {
        resp = error.response.data;
      } else {
        resp = error.message || "";
      }
    } finally {
      const end = performance.now();
      latency = Math.round(end - start);
      if (resp === undefined || resp === null) {
        resp = "";
      }
    }

    let evalResp: EvalResponse | undefined = undefined;
    let modules = { cheerio };

    try {
      const evalFunction = new Function(
        "statusCode",
        "responseTime",
        "responseRaw",
        "modules",
        `return (${monitorEval})(statusCode, responseTime, responseRaw, modules);`,
      );
      evalResp = await evalFunction(statusCode, latency, resp, modules);
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message.length > 200) {
          errorMessage += ` | Eval error: ${error.message.substring(0, 200)}...`;
        } else {
          errorMessage += ` | Eval error: ${error.message}`;
        }
      } else {
        errorMessage += ` | Eval error: ${String(error)}`;
      }
    }

    if (!evalResp || typeof evalResp !== "object") {
      evalResp = {
        status: GC.DOWN,
        latency: latency,
        type: GC.ERROR,
      };
      errorMessage += " | Eval must return an object with 'status' and 'latency' fields, got no response";
    } else if (evalResp.status === undefined) {
      evalResp = {
        status: GC.DOWN,
        latency: latency,
        type: GC.ERROR,
      };
      errorMessage += ` | Eval must return an object with a 'status' field (one of: ${GC.UP}, ${GC.DOWN}, ${GC.DEGRADED}, ${GC.MAINTENANCE}), but 'status' was missing`;
    } else if (([GC.UP, GC.DOWN, GC.DEGRADED, GC.MAINTENANCE] as string[]).indexOf(evalResp.status) === -1) {
      evalResp = {
        status: GC.DOWN,
        latency: latency,
        type: GC.ERROR,
      };
      errorMessage += ` | Eval returned invalid 'status' value "${evalResp.status}". Must be one of: ${GC.UP}, ${GC.DOWN}, ${GC.DEGRADED}, ${GC.MAINTENANCE}`;
    } else {
      evalResp.type = GC.REALTIME;
      // Ensure latency is a valid number; fall back to measured latency
      if (typeof evalResp.latency !== "number" || isNaN(evalResp.latency)) {
        errorMessage += ` | Eval 'latency' must be a number, got ${JSON.stringify(evalResp.latency)}. Using measured latency instead`;
        evalResp.latency = latency;
      }
    }

    let toWrite: MonitoringResult = {
      status: GC.DOWN,
      latency: latency,
      type: GC.ERROR,
      error_message: errorMessage,
    };
    if (evalResp.status !== undefined && evalResp.status !== null) {
      toWrite.status = evalResp.status;
    }
    if (evalResp.latency !== undefined && evalResp.latency !== null) {
      toWrite.latency = evalResp.latency;
    }
    if (evalResp.type !== undefined && evalResp.type !== null) {
      toWrite.type = evalResp.type;
    }
    if (timeoutError) {
      toWrite.type = GC.TIMEOUT;
    }

    return toWrite;
  }
}

export default ApiCall;
