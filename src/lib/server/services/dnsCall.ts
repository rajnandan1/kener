import DNSResolver from "../dns.js";
import GC from "../../global-constants.js";
import type { DnsMonitor, MonitoringResult } from "../types/monitor.js";

class DnsCall {
  monitor: DnsMonitor;

  constructor(monitor: DnsMonitor) {
    this.monitor = monitor;
  }

  async execute(): Promise<MonitoringResult> {
    const dnsResolver = new DNSResolver(this.monitor.type_data.nameServer);
    let host = this.monitor.type_data.host;
    let recordType = this.monitor.type_data.lookupRecord;
    let matchType = this.monitor.type_data.matchType;
    let values = this.monitor.type_data.values;

    try {
      let queryStartTime = Date.now();
      let dnsRes = await dnsResolver.getRecord(host, recordType);
      let latency = Date.now() - queryStartTime;

      if (dnsRes[recordType] === undefined) {
        return {
          status: GC.DOWN,
          latency: latency,
          type: GC.REALTIME,
        };
      }
      let data = dnsRes[recordType];
      let dnsData = data.map((d) => d.data);
      if (matchType === "ALL") {
        for (let i = 0; i < values.length; i++) {
          if (dnsData.indexOf(values[i].trim()) === -1) {
            return {
              status: GC.DOWN,
              latency: latency,
              type: GC.REALTIME,
            };
          }
        }
        return {
          status: GC.UP,
          latency: latency,
          type: GC.REALTIME,
        };
      } else if (matchType === "ANY") {
        for (let i = 0; i < values.length; i++) {
          if (dnsData.indexOf(values[i].trim()) !== -1) {
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
        };
      }
    } catch (error) {
      console.log("Error in dnsChecker", error);
    }
    return {
      status: GC.DOWN,
      latency: 0,
      type: GC.REALTIME,
    };
  }
}

export default DnsCall;
