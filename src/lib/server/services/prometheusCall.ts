import type { PrometheusThreshold } from "../types/monitor.js";

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
