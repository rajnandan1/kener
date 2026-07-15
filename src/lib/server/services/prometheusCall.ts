import axios, { type AxiosRequestConfig } from "axios";
import https from "https";
import GC from "../../global-constants.js";
import version from "../../version.js";
import { GetRequiredSecrets, ReplaceAllOccurrences } from "../tool.js";
import type { PrometheusMonitor, PrometheusThreshold, MonitoringResult } from "../types/monitor.js";

/**
 * Parse a Prometheus sample value string into a number.
 * Sample values are strings and may be "NaN", "+Inf", or "-Inf", which
 * `parseFloat` mishandles (parseFloat("+Inf") === NaN), so special-case them.
 */
export function parsePromValue(raw: string): number {
  if (raw === "NaN") return NaN;
  if (raw === "+Inf") return Infinity;
  if (raw === "-Inf") return -Infinity;
  return parseFloat(raw);
}

/**
 * Evaluate `metricValue <operator> threshold.value`. The metric value is
 * always the left operand.
 */
export function matchesThreshold(value: number, threshold: PrometheusThreshold): boolean {
  switch (threshold.operator) {
    case ">":
      return value > threshold.value;
    case ">=":
      return value >= threshold.value;
    case "<":
      return value < threshold.value;
    case "<=":
      return value <= threshold.value;
    case "==":
      return value === threshold.value;
    case "!=":
      return value !== threshold.value;
    default:
      return false;
  }
}

class PrometheusCall {
  monitor: PrometheusMonitor;
  envSecrets: Array<{ find: string; replace: string | undefined }>;

  constructor(monitor: PrometheusMonitor) {
    this.monitor = monitor;
    // Secret substitution applies to url + header values only, never the query.
    this.envSecrets = GetRequiredSecrets(`${monitor.type_data.url} ${JSON.stringify(monitor.type_data.headers || [])}`);
  }

  async execute(): Promise<MonitoringResult> {
    const data = this.monitor.type_data;
    const timeout = data.timeout || 10000;

    // Malformed config (e.g. created via the API without a url) must record a
    // result, never throw out of the worker and leave a gap in the timeline.
    if (typeof data.url !== "string" || data.url.trim() === "") {
      return this.fail(GC.ERROR, "Prometheus monitor is missing a url");
    }

    // Apply secrets to url + serialized headers only (never the query).
    let url = data.url;
    let headersJson = JSON.stringify(data.headers || []);
    for (const secret of this.envSecrets) {
      if (secret.replace === undefined) continue;
      url = ReplaceAllOccurrences(url, secret.find, secret.replace);
      headersJson = ReplaceAllOccurrences(headersJson, secret.find, secret.replace);
    }

    // Build the query endpoint: strip trailing slashes, append /api/v1/query.
    const endpoint = `${url.replace(/\/+$/, "")}/api/v1/query`;

    // Merge default headers with user headers (user wins on collision).
    const axiosHeaders: Record<string, string> = {
      "User-Agent": `Kener/${version()}`,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    };
    try {
      const userHeaders: Array<{ key: string; value: string }> = JSON.parse(headersJson);
      for (const h of userHeaders) {
        if (h && h.key) axiosHeaders[h.key] = h.value;
      }
    } catch (e) {
      console.log(e);
    }

    const options: AxiosRequestConfig = {
      method: "POST",
      headers: axiosHeaders,
      timeout,
      data: `query=${encodeURIComponent(data.query)}`,
      validateStatus: () => true, // handle non-2xx ourselves
      httpsAgent: new https.Agent({
        rejectUnauthorized: !data.allowSelfSignedCert,
      }),
    };

    // 1. Transport errors -> DOWN.
    let response;
    try {
      response = await axios(endpoint, options);
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error.code === "ECONNABORTED" || (error.message && error.message.includes("timeout"))) {
        return this.fail(GC.TIMEOUT, `Request timed out after ${timeout}ms`);
      }
      return this.fail(GC.ERROR, error.message || "Network error");
    }

    // 1b. HTTP non-2xx -> DOWN (surface the prometheus error field if present).
    if (response.status < 200 || response.status >= 300) {
      const promError =
        response.data && typeof response.data === "object" && response.data.error ? `: ${response.data.error}` : "";
      return this.fail(GC.ERROR, `HTTP ${response.status}${promError}`);
    }

    const body = response.data;

    // 1c. Require an explicit success envelope. A 2xx that is not a well-formed
    // Prometheus success response - an API error, or an auth-proxy HTML/JSON
    // page - must be an ERROR, not silently treated as no-data (which
    // noDataStatus=UP would otherwise report as UP).
    if (!body || typeof body !== "object" || body.status !== "success") {
      const promError = body && typeof body === "object" && body.error ? body.error : null;
      return this.fail(GC.ERROR, promError || "Prometheus did not return a successful response");
    }

    const resultType = body.data?.resultType;
    const result = body.data?.result;

    // Only instant vectors and scalars are supported. Anything else - matrix,
    // string, or an unrecognized/absent result type - is a config or response
    // error rather than no-data.
    if (resultType !== "scalar" && resultType !== "vector") {
      const msg =
        resultType === "matrix" || resultType === "string"
          ? "query must return an instant vector or scalar"
          : "unexpected Prometheus response";
      return this.fail(GC.ERROR, msg);
    }

    // Extract the raw sample value; null means empty / no-data.
    let rawValue: string | null;
    if (resultType === "scalar") {
      rawValue = Array.isArray(result) ? result[1] : null;
    } else {
      // vector
      rawValue = Array.isArray(result) && result.length > 0 ? (result[0]?.value?.[1] ?? null) : null;
    }

    // 2. Empty result -> noDataStatus.
    if (rawValue === null) {
      return this.noData();
    }

    const metricValue = parsePromValue(rawValue);

    // 2b. NaN -> treated as no data.
    if (Number.isNaN(metricValue)) {
      return this.noData();
    }

    // Charted measurement: finite values only, else 0 (status still follows thresholds).
    const latency = Number.isFinite(metricValue) ? metricValue : 0;

    // 3. down beats 4. degraded.
    if (data.down && matchesThreshold(metricValue, data.down)) {
      return { status: GC.DOWN, latency, type: GC.REALTIME };
    }
    if (data.degraded && matchesThreshold(metricValue, data.degraded)) {
      return { status: GC.DEGRADED, latency, type: GC.REALTIME };
    }
    // 5. Otherwise UP.
    return { status: GC.UP, latency, type: GC.REALTIME };
  }

  /** Empty-result / NaN outcome: configurable status, charted as 0. */
  private noData(): MonitoringResult {
    const map: Record<string, string> = { UP: GC.UP, DEGRADED: GC.DEGRADED, DOWN: GC.DOWN };
    const status = map[this.monitor.type_data.noDataStatus || "DOWN"] ?? GC.DOWN;
    return { status, latency: 0, type: GC.REALTIME };
  }

  /** DOWN failure with a message truncated to 200 chars (as sqlCall does). */
  private fail(type: string, message: string): MonitoringResult {
    let error_message = message;
    if (error_message.length > 200) {
      error_message = error_message.substring(0, 200) + "...";
    }
    return { status: GC.DOWN, latency: 0, type, error_message };
  }
}

export default PrometheusCall;
