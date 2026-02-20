import DNSResolver from "../dns.js";
import GC from "../../global-constants.js";
import type { DnsMonitor, MonitoringResult } from "../types/monitor.js";

class DnsCall {
  monitor: DnsMonitor;

  constructor(monitor: DnsMonitor) {
    this.monitor = monitor;
  }

  private normalizeDnsValue(value: unknown): string {
    if (value === null || value === undefined) return "";
    if (Array.isArray(value)) {
      return value
        .map((v) => this.normalizeDnsValue(v))
        .filter(Boolean)
        .join(" ")
        .trim();
    }
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    return String(value).trim().replace(/\.$/, "").toLowerCase();
  }

  async execute(): Promise<MonitoringResult> {
    const dnsResolver = new DNSResolver();
    let host = this.monitor.type_data.host;
    let recordType = this.monitor.type_data.lookupRecord;
    let matchType = this.monitor.type_data.matchType;
    let values = this.monitor.type_data.values;
    const configuredNameServer = this.monitor.type_data.nameServer?.trim() || undefined;
    const queryStartTime = Date.now();

    try {
      let dnsRes = await dnsResolver.getRecord(host, recordType, configuredNameServer);
      let latency = Date.now() - queryStartTime;

      if (dnsRes[recordType] === undefined) {
        return {
          status: GC.DOWN,
          latency: latency,
          type: GC.REALTIME,
          error_message: `No DNS ${recordType} response found for ${host}`,
        };
      }
      let data = dnsRes[recordType];
      let dnsData = data.map((d) => this.normalizeDnsValue(d.data)).filter(Boolean);
      let expectedValues = values.map((v) => this.normalizeDnsValue(v)).filter(Boolean);

      if (dnsData.length === 0) {
        return {
          status: GC.DOWN,
          latency: latency,
          type: GC.REALTIME,
          error_message: `No DNS ${recordType} records returned for ${host}`,
        };
      }

      if (matchType === "ALL") {
        const missingValues = expectedValues.filter((value) => !dnsData.includes(value));
        if (missingValues.length > 0) {
          return {
            status: GC.DOWN,
            latency: latency,
            type: GC.REALTIME,
            error_message: `DNS ${recordType} mismatch for ${host}. Missing: ${missingValues.join(", ")}`,
          };
        }
        return {
          status: GC.UP,
          latency: latency,
          type: GC.REALTIME,
        };
      } else if (matchType === "ANY") {
        for (let i = 0; i < expectedValues.length; i++) {
          if (dnsData.includes(expectedValues[i])) {
            return {
              status: GC.UP,
              latency: latency,
              type: GC.REALTIME,
            };
          }
        }
        return {
          status: GC.DOWN,
          latency: latency,
          type: GC.REALTIME,
          error_message: `DNS ${recordType} mismatch for ${host}. Got: ${dnsData.join(", ")}`,
        };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const latency = Date.now() - queryStartTime;
      return {
        status: GC.DOWN,
        latency,
        type: GC.REALTIME,
        error_message: `DNS query failed for ${host} (${recordType}): ${message}`,
      };
    }
    return {
      status: GC.DOWN,
      latency: Date.now() - queryStartTime,
      type: GC.REALTIME,
      error_message: `DNS ${recordType} check did not return a definitive result for ${host}`,
    };
  }
}

export default DnsCall;
