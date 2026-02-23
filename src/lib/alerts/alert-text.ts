import GC from "$lib/global-constants";

type AlertTextKind = "label" | "help" | "description";

interface AlertTextInput {
  kind: AlertTextKind;
  alert_for: string;
  alert_value?: string | number;
  failure_threshold?: number;
  success_threshold?: number;
}

export function getAlertText({
  kind,
  alert_for,
  alert_value,
  failure_threshold,
  success_threshold,
}: AlertTextInput): string {
  if (kind === "label") {
    switch (alert_for) {
      case GC.STATUS:
        return "Status Value";
      case GC.LATENCY:
        return "Latency Threshold (ms)";
      case GC.UPTIME:
        return "Uptime Threshold (%)";
      default:
        return "Value";
    }
  }

  if (kind === "help") {
    switch (alert_for) {
      case GC.STATUS:
        return "Alert when monitor status equals this value";
      case GC.LATENCY:
        return "Alert when latency exceeds this value (in milliseconds)";
      case GC.UPTIME:
        return "Alert when uptime falls below this percentage";
      default:
        return "";
    }
  }

  const thresholdValue = failure_threshold ?? 0;
  const resolveThreshold = success_threshold ?? 0;
  const value = alert_value ?? "";

  if (alert_for === GC.STATUS) {
    return `Alert when ${thresholdValue} consecutive checks result in ${value}. Resolve after ${resolveThreshold} successful check(s).`;
  }

  if (alert_for === GC.LATENCY) {
    return `Alert when latency exceeds ${value}ms for ${thresholdValue} consecutive checks. Resolve after ${resolveThreshold} check(s) below threshold.`;
  }

  if (alert_for === GC.UPTIME) {
    return `Alert when uptime falls below ${value}% for ${thresholdValue} checks. Resolve after ${resolveThreshold} check(s) above threshold.`;
  }

  return "";
}
