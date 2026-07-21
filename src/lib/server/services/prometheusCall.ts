import axios, { type AxiosRequestConfig } from "axios";
import https from "https";
import GC from "../../global-constants.js";
import version from "../../version.js";
import { GetRequiredSecrets, ReplaceAllOccurrences, ApplySecretsToHeaders } from "../tool.js";
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
    // Read type_data defensively: a malformed monitor (missing type_data) must
    // be reported by execute() as an ERROR result, so the constructor must not
    // throw before execute() ever runs.
    const td = monitor.type_data;
    this.envSecrets = GetRequiredSecrets(`${td?.url ?? ""} ${JSON.stringify(td?.headers || [])}`);
  }

  /**
   * Run the configured PromQL instant query and map the result to a
   * MonitoringResult. Every outcome - malformed config, transport/HTTP/API
   * error, no data, or a threshold match - resolves to a result; this never
   * throws, so a scheduled check always records a row.
   */
  async execute(): Promise<MonitoringResult> {
    const data = this.monitor.type_data;

    // Malformed config (missing type_data or url, e.g. created via the API)
    // must record a result, never throw out of the worker and leave a gap in
    // the timeline.
    if (!data || typeof data.url !== "string" || data.url.trim() === "") {
      return this.fail(GC.ERROR, "Prometheus monitor is missing a url");
    }

    const timeout = data.timeout || 10000;

    // Apply secrets to the url only (never the query). Header secrets are
    // substituted per-field below.
    let url = data.url;
    for (const secret of this.envSecrets) {
      if (secret.replace === undefined) continue;
      url = ReplaceAllOccurrences(url, secret.find, secret.replace);
    }

    // Build the query endpoint: strip trailing slashes, append /api/v1/query.
    const endpoint = `${url.replace(/\/+$/, "")}/api/v1/query`;

    // Merge default headers with user headers (user wins on collision). Secrets
    // are substituted into each header key/value individually - never into a
    // JSON blob, which a secret value could corrupt and drop the whole set.
    const axiosHeaders: Record<string, string> = {
      "User-Agent": `Kener/${version()}`,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      ...ApplySecretsToHeaders(data.headers, this.envSecrets),
    };

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

    // Extract the raw sample value, rejecting payloads that do not match the
    // result type's shape. A malformed response must be an ERROR, not silently
    // treated as no-data (which noDataStatus=UP would report as healthy). An
    // empty vector is the one legitimate no-data case.
    let rawValue: string;
    if (resultType === "scalar") {
      // A scalar is always [ <time>, "<value>" ]; there is no empty scalar.
      if (!Array.isArray(result) || result.length < 2 || result[1] == null) {
        return this.fail(GC.ERROR, "malformed scalar result");
      }
      rawValue = String(result[1]);
    } else {
      // A vector is an array of { metric, value: [ <time>, "<value>" ] }.
      if (!Array.isArray(result)) {
        return this.fail(GC.ERROR, "malformed vector result");
      }
      if (result.length === 0) {
        return this.noData(); // empty vector = genuine no-data
      }
      const sample = result[0]?.value;
      if (!Array.isArray(sample) || sample.length < 2 || sample[1] == null) {
        return this.fail(GC.ERROR, "malformed vector result");
      }
      rawValue = String(sample[1]);
    }

    const metricValue = parsePromValue(rawValue);

    // A real Prometheus "NaN" sample value -> treated as no data.
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
