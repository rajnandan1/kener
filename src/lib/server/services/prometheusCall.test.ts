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
