import { beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import PrometheusCall, { parsePromValue, matchesThreshold } from "./prometheusCall";
import type { PrometheusMonitor } from "../types/monitor";

vi.mock("axios", () => ({ default: vi.fn() }));
const mockedAxios = vi.mocked(axios);

beforeEach(() => {
  mockedAxios.mockReset();
});

// --- Fixtures -------------------------------------------------------------
function makeMonitor(overrides: Partial<PrometheusMonitor["type_data"]> = {}): PrometheusMonitor {
  return {
    tag: "prom-test",
    type_data: {
      url: "https://prom.example.com",
      query: "up",
      ...overrides,
    },
  };
}

function successBody(resultType: string, result: unknown) {
  return { status: "success", data: { resultType, result } };
}

function vec(value: string, metric: Record<string, string> = {}) {
  return { metric, value: [1719999999, value] };
}

// --- Cycle A: pure helpers ------------------------------------------------
describe("parsePromValue", () => {
  it("parses plain numbers", () => {
    expect(parsePromValue("0.42")).toBe(0.42);
    expect(parsePromValue("100")).toBe(100);
  });

  it("special-cases NaN and infinities", () => {
    expect(Number.isNaN(parsePromValue("NaN"))).toBe(true);
    expect(parsePromValue("+Inf")).toBe(Infinity);
    expect(parsePromValue("-Inf")).toBe(-Infinity);
  });
});

describe("matchesThreshold", () => {
  it("evaluates all six operators with the metric value as the left operand", () => {
    expect(matchesThreshold(2, { operator: ">", value: 1 })).toBe(true);
    expect(matchesThreshold(2, { operator: ">=", value: 2 })).toBe(true);
    expect(matchesThreshold(1, { operator: "<", value: 2 })).toBe(true);
    expect(matchesThreshold(2, { operator: "<=", value: 2 })).toBe(true);
    expect(matchesThreshold(2, { operator: "==", value: 2 })).toBe(true);
    expect(matchesThreshold(2, { operator: "!=", value: 3 })).toBe(true);
  });

  it("returns false when the condition does not hold", () => {
    expect(matchesThreshold(1, { operator: ">", value: 1 })).toBe(false);
    expect(matchesThreshold(2, { operator: "==", value: 3 })).toBe(false);
  });

  it("evaluates +/-Inf against thresholds normally", () => {
    expect(matchesThreshold(Infinity, { operator: ">", value: 0.95 })).toBe(true);
    expect(matchesThreshold(-Infinity, { operator: "<", value: 0 })).toBe(true);
  });
});

// --- Cycle B: PrometheusCall.execute() ------------------------------------
describe("PrometheusCall.execute", () => {
  it("strips trailing slashes and appends /api/v1/query, POSTing the urlencoded query", async () => {
    mockedAxios.mockResolvedValue({ status: 200, data: successBody("vector", [vec("1")]) });
    await new PrometheusCall(makeMonitor({ url: "https://prom.example.com///", query: "up == 1" })).execute();
    const [calledUrl, opts] = mockedAxios.mock.calls[0] as [string, any];
    expect(calledUrl).toBe("https://prom.example.com/api/v1/query");
    expect(opts.method).toBe("POST");
    expect(opts.data).toBe("query=up%20%3D%3D%201");
  });

  it("works with a base-path url", async () => {
    mockedAxios.mockResolvedValue({ status: 200, data: successBody("vector", [vec("1")]) });
    await new PrometheusCall(makeMonitor({ url: "https://host/prom/" })).execute();
    const [calledUrl] = mockedAxios.mock.calls[0] as [string, any];
    expect(calledUrl).toBe("https://host/prom/api/v1/query");
  });

  it("merges default headers with user headers (user wins on collision)", async () => {
    mockedAxios.mockResolvedValue({ status: 200, data: successBody("vector", [vec("1")]) });
    await new PrometheusCall(
      makeMonitor({
        headers: [
          { key: "Accept", value: "text/plain" },
          { key: "X-Token", value: "abc" },
        ],
      }),
    ).execute();
    const [, opts] = mockedAxios.mock.calls[0] as [string, any];
    expect(opts.headers["User-Agent"]).toMatch(/^Kener\//);
    expect(opts.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
    expect(opts.headers["Accept"]).toBe("text/plain"); // user override wins
    expect(opts.headers["X-Token"]).toBe("abc");
  });

  it("parses a scalar result", async () => {
    mockedAxios.mockResolvedValue({ status: 200, data: successBody("scalar", [1719999999, "0.42"]) });
    const r = await new PrometheusCall(makeMonitor()).execute();
    expect(r.status).toBe("UP");
    expect(r.latency).toBe(0.42);
    expect(r.type).toBe("REALTIME");
  });

  it("parses the first series of a multi-series vector result", async () => {
    mockedAxios.mockResolvedValue({ status: 200, data: successBody("vector", [vec("3"), vec("9")]) });
    const r = await new PrometheusCall(makeMonitor()).execute();
    expect(r.status).toBe("UP");
    expect(r.latency).toBe(3);
  });

  it("checks down before degraded when both match", async () => {
    mockedAxios.mockResolvedValue({ status: 200, data: successBody("vector", [vec("100")]) });
    const r = await new PrometheusCall(
      makeMonitor({ down: { operator: ">", value: 90 }, degraded: { operator: ">", value: 50 } }),
    ).execute();
    expect(r.status).toBe("DOWN");
    expect(r.latency).toBe(100);
  });

  it("returns DEGRADED when only the degraded condition matches", async () => {
    mockedAxios.mockResolvedValue({ status: 200, data: successBody("vector", [vec("70")]) });
    const r = await new PrometheusCall(
      makeMonitor({ down: { operator: ">", value: 90 }, degraded: { operator: ">", value: 50 } }),
    ).execute();
    expect(r.status).toBe("DEGRADED");
  });

  it("returns UP when no threshold matches", async () => {
    mockedAxios.mockResolvedValue({ status: 200, data: successBody("vector", [vec("1")]) });
    const r = await new PrometheusCall(
      makeMonitor({ down: { operator: ">", value: 90 }, degraded: { operator: ">", value: 50 } }),
    ).execute();
    expect(r.status).toBe("UP");
  });

  it("uses noDataStatus (default DOWN) for an empty vector, charting 0", async () => {
    mockedAxios.mockResolvedValue({ status: 200, data: successBody("vector", []) });
    const r = await new PrometheusCall(makeMonitor()).execute();
    expect(r.status).toBe("DOWN");
    expect(r.latency).toBe(0);
    expect(r.type).toBe("REALTIME");
  });

  it.each(["UP", "DEGRADED", "DOWN"] as const)("honors noDataStatus=%s on an empty vector", async (nds) => {
    mockedAxios.mockResolvedValue({ status: 200, data: successBody("vector", []) });
    const r = await new PrometheusCall(makeMonitor({ noDataStatus: nds })).execute();
    expect(r.status).toBe(nds);
  });

  it("treats a NaN value as no data", async () => {
    mockedAxios.mockResolvedValue({ status: 200, data: successBody("vector", [vec("NaN")]) });
    const r = await new PrometheusCall(makeMonitor({ noDataStatus: "DEGRADED" })).execute();
    expect(r.status).toBe("DEGRADED");
    expect(r.latency).toBe(0);
  });

  it("evaluates +Inf against thresholds but charts 0", async () => {
    mockedAxios.mockResolvedValue({ status: 200, data: successBody("vector", [vec("+Inf")]) });
    const r = await new PrometheusCall(makeMonitor({ down: { operator: ">", value: 0.95 } })).execute();
    expect(r.status).toBe("DOWN"); // Infinity > 0.95
    expect(r.latency).toBe(0); // non-finite clamped
    expect(r.type).toBe("REALTIME");
  });

  it("evaluates -Inf against thresholds but charts 0", async () => {
    mockedAxios.mockResolvedValue({ status: 200, data: successBody("vector", [vec("-Inf")]) });
    const r = await new PrometheusCall(makeMonitor({ down: { operator: "<", value: 0 } })).execute();
    expect(r.status).toBe("DOWN"); // -Infinity < 0
    expect(r.latency).toBe(0);
    expect(r.type).toBe("REALTIME");
  });

  it("adds a differently-cased user header alongside the default (exact-case merge)", async () => {
    mockedAxios.mockResolvedValue({ status: 200, data: successBody("vector", [vec("1")]) });
    await new PrometheusCall(makeMonitor({ headers: [{ key: "accept", value: "text/plain" }] })).execute();
    const [, opts] = mockedAxios.mock.calls[0] as [string, any];
    expect(opts.headers["Accept"]).toBe("application/json"); // default retained
    expect(opts.headers["accept"]).toBe("text/plain"); // user header added under its own case
  });

  it("maps a body-level error (bad PromQL) to ERROR/DOWN with the message", async () => {
    mockedAxios.mockResolvedValue({
      status: 200,
      data: { status: "error", errorType: "bad_data", error: "parse error: unexpected identifier" },
    });
    const r = await new PrometheusCall(makeMonitor()).execute();
    expect(r.status).toBe("DOWN");
    expect(r.type).toBe("ERROR");
    expect(r.error_message).toContain("parse error");
  });

  it("rejects a matrix result type as a config error", async () => {
    mockedAxios.mockResolvedValue({ status: 200, data: successBody("matrix", []) });
    const r = await new PrometheusCall(makeMonitor()).execute();
    expect(r.status).toBe("DOWN");
    expect(r.type).toBe("ERROR");
    expect(r.error_message).toBe("query must return an instant vector or scalar");
  });

  it("rejects a string result type as a config error", async () => {
    mockedAxios.mockResolvedValue({ status: 200, data: successBody("string", [1719999999, "hi"]) });
    const r = await new PrometheusCall(makeMonitor()).execute();
    expect(r.status).toBe("DOWN");
    expect(r.type).toBe("ERROR");
    expect(r.error_message).toBe("query must return an instant vector or scalar");
  });

  it("rejects a vector whose result payload is an object, not an array", async () => {
    // resultType says vector but result is an object -> malformed, not no-data,
    // even when noDataStatus=UP would otherwise report it as healthy.
    mockedAxios.mockResolvedValue({
      status: 200,
      data: { status: "success", data: { resultType: "vector", result: {} } },
    });
    const r = await new PrometheusCall(makeMonitor({ noDataStatus: "UP" })).execute();
    expect(r.status).toBe("DOWN");
    expect(r.type).toBe("ERROR");
    expect(r.error_message).toBe("malformed vector result");
  });

  it("rejects a vector element that is missing its value tuple", async () => {
    mockedAxios.mockResolvedValue({ status: 200, data: successBody("vector", [{ metric: {} }]) });
    const r = await new PrometheusCall(makeMonitor({ noDataStatus: "UP" })).execute();
    expect(r.status).toBe("DOWN");
    expect(r.type).toBe("ERROR");
    expect(r.error_message).toBe("malformed vector result");
  });

  it("rejects a scalar result that is not a [time, value] tuple", async () => {
    mockedAxios.mockResolvedValue({ status: 200, data: successBody("scalar", { value: "1" }) });
    const r = await new PrometheusCall(makeMonitor({ noDataStatus: "UP" })).execute();
    expect(r.status).toBe("DOWN");
    expect(r.type).toBe("ERROR");
    expect(r.error_message).toBe("malformed scalar result");
  });

  it("still treats an empty vector as genuine no-data, not malformed", async () => {
    mockedAxios.mockResolvedValue({ status: 200, data: successBody("vector", []) });
    const r = await new PrometheusCall(makeMonitor({ noDataStatus: "UP" })).execute();
    expect(r.status).toBe("UP"); // empty vector honors noDataStatus
    expect(r.type).toBe("REALTIME");
  });

  it("treats a 2xx that is not a Prometheus success as ERROR, not no-data", async () => {
    // An auth proxy returning a 200 HTML login page must not be reported as UP,
    // even when noDataStatus=UP would otherwise map no-data to UP.
    mockedAxios.mockResolvedValue({ status: 200, data: "<html>login</html>" });
    const r = await new PrometheusCall(makeMonitor({ noDataStatus: "UP" })).execute();
    expect(r.status).toBe("DOWN");
    expect(r.type).toBe("ERROR");
    expect(r.error_message).toBe("Prometheus did not return a successful response");
  });

  it("treats a success envelope with an unrecognized result type as ERROR, not no-data", async () => {
    mockedAxios.mockResolvedValue({ status: 200, data: { status: "success", data: {} } });
    const r = await new PrometheusCall(makeMonitor({ noDataStatus: "UP" })).execute();
    expect(r.status).toBe("DOWN");
    expect(r.type).toBe("ERROR");
    expect(r.error_message).toBe("unexpected Prometheus response");
  });

  it("records ERROR instead of throwing when the url is missing", async () => {
    const r = await new PrometheusCall(makeMonitor({ url: "" })).execute();
    expect(r.status).toBe("DOWN");
    expect(r.type).toBe("ERROR");
    expect(r.error_message).toBe("Prometheus monitor is missing a url");
    expect(mockedAxios).not.toHaveBeenCalled();
  });

  it("does not throw in the constructor and records ERROR when type_data is null", async () => {
    // The worker constructs the service before calling execute(), so the
    // constructor must survive a malformed (null type_data) monitor.
    const monitor = { tag: "prom-test", type_data: null } as unknown as PrometheusMonitor;
    const r = await new PrometheusCall(monitor).execute();
    expect(r.status).toBe("DOWN");
    expect(r.type).toBe("ERROR");
    expect(r.error_message).toBe("Prometheus monitor is missing a url");
    expect(mockedAxios).not.toHaveBeenCalled();
  });

  it("maps HTTP non-2xx to ERROR and surfaces the prometheus error field", async () => {
    mockedAxios.mockResolvedValue({ status: 422, data: { status: "error", error: "invalid expression type" } });
    const r = await new PrometheusCall(makeMonitor()).execute();
    expect(r.status).toBe("DOWN");
    expect(r.type).toBe("ERROR");
    expect(r.error_message).toContain("422");
    expect(r.error_message).toContain("invalid expression type");
  });

  it("maps a timeout (ECONNABORTED) to TIMEOUT", async () => {
    mockedAxios.mockRejectedValue({ code: "ECONNABORTED", message: "timeout of 10000ms exceeded" });
    const r = await new PrometheusCall(makeMonitor({ timeout: 10000 })).execute();
    expect(r.status).toBe("DOWN");
    expect(r.type).toBe("TIMEOUT");
    expect(r.error_message).toBe("Request timed out after 10000ms");
  });

  it("maps a network error to ERROR with the axios message", async () => {
    mockedAxios.mockRejectedValue({ code: "ECONNREFUSED", message: "connect ECONNREFUSED 127.0.0.1:9090" });
    const r = await new PrometheusCall(makeMonitor()).execute();
    expect(r.status).toBe("DOWN");
    expect(r.type).toBe("ERROR");
    expect(r.error_message).toContain("ECONNREFUSED");
  });

  it("stores the metric value as latency on a plain success", async () => {
    mockedAxios.mockResolvedValue({ status: 200, data: successBody("scalar", [123, "1.5"]) });
    const r = await new PrometheusCall(makeMonitor()).execute();
    expect(r.latency).toBe(1.5);
  });

  // --- errorStatus ---------------------------------------------------------
  // noDataStatus covers "Prometheus answered, but with nothing". errorStatus covers
  // "Prometheus did not answer" — transport failures, timeouts, non-2xx and malformed
  // payloads — which previously had no knob at all and were always DOWN. A monitor whose
  // reading is a capacity metric wants a lost scrape to read DEGRADED, not a false outage.

  it("defaults to DOWN on a network error when errorStatus is unset", async () => {
    mockedAxios.mockRejectedValue({ code: "ECONNREFUSED", message: "connect ECONNREFUSED" });
    const r = await new PrometheusCall(makeMonitor()).execute();
    expect(r.status).toBe("DOWN");
  });

  it.each(["UP", "DEGRADED", "DOWN"] as const)("honors errorStatus=%s on a network error", async (es) => {
    mockedAxios.mockRejectedValue({ code: "ECONNREFUSED", message: "connect ECONNREFUSED" });
    const r = await new PrometheusCall(makeMonitor({ errorStatus: es })).execute();
    expect(r.status).toBe(es);
  });

  it("honors errorStatus on a timeout", async () => {
    mockedAxios.mockRejectedValue({ code: "ECONNABORTED", message: "timeout of 10000ms exceeded" });
    const r = await new PrometheusCall(makeMonitor({ errorStatus: "DEGRADED" })).execute();
    expect(r.status).toBe("DEGRADED");
  });

  it("honors errorStatus on an HTTP non-2xx", async () => {
    mockedAxios.mockResolvedValue({ status: 503, data: { status: "error", error: "service unavailable" } });
    const r = await new PrometheusCall(makeMonitor({ errorStatus: "DEGRADED" })).execute();
    expect(r.status).toBe("DEGRADED");
  });

  it("honors errorStatus on a malformed result type", async () => {
    mockedAxios.mockResolvedValue({ status: 200, data: successBody("matrix", []) });
    const r = await new PrometheusCall(makeMonitor({ errorStatus: "DEGRADED" })).execute();
    expect(r.status).toBe("DEGRADED");
  });

  it("honors errorStatus when type_data has no url", async () => {
    const r = await new PrometheusCall(makeMonitor({ url: "", errorStatus: "DEGRADED" })).execute();
    expect(r.status).toBe("DEGRADED");
  });

  it("keeps type and error_message intact when errorStatus softens the status", async () => {
    mockedAxios.mockRejectedValue({ code: "ECONNABORTED", message: "timeout of 4200ms exceeded" });
    const r = await new PrometheusCall(makeMonitor({ timeout: 4200, errorStatus: "DEGRADED" })).execute();
    expect(r.status).toBe("DEGRADED");
    expect(r.type).toBe("TIMEOUT");
    expect(r.error_message).toBe("Request timed out after 4200ms");
    expect(r.latency).toBe(0);
  });

  it("falls back to DOWN for an unrecognized errorStatus rather than recording it verbatim", async () => {
    mockedAxios.mockRejectedValue({ code: "ECONNREFUSED", message: "connect ECONNREFUSED" });
    const r = await new PrometheusCall(makeMonitor({ errorStatus: "BANANA" as never })).execute();
    expect(r.status).toBe("DOWN");
  });

  it("keeps errorStatus and noDataStatus independent", async () => {
    mockedAxios.mockResolvedValue({ status: 200, data: successBody("vector", []) });
    const r = await new PrometheusCall(makeMonitor({ errorStatus: "UP", noDataStatus: "DEGRADED" })).execute();
    expect(r.status).toBe("DEGRADED");
  });
});
