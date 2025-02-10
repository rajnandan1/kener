// @ts-nocheck
import axios from "axios";
import DNSResolver from "../dns.js";
import { UP, DOWN, DEGRADED, REALTIME, TIMEOUT, ERROR, MANUAL } from "../constants.js";

class DnsCall {
  monitor;

  constructor(monitor) {
    this.monitor = monitor;
  }

  async execute() {
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
          status: DOWN,
          latency: latency,
          type: REALTIME,
        };
      }
      let data = dnsRes[recordType];
      let dnsData = data.map((d) => d.data);
      if (matchType === "ALL") {
        for (let i = 0; i < values.length; i++) {
          if (dnsData.indexOf(values[i].trim()) === -1) {
            return {
              status: DOWN,
              latency: latency,
              type: REALTIME,
            };
          }
        }
        return {
          status: UP,
          latency: latency,
          type: REALTIME,
        };
      } else if (matchType === "ANY") {
        for (let i = 0; i < values.length; i++) {
          if (dnsData.indexOf(values[i].trim()) !== -1) {
            return {
              status: UP,
              latency: latency,
              type: REALTIME,
            };
          }
        }
        return {
          status: DOWN,
          latency: latency,
          type: REALTIME,
        };
      }
    } catch (error) {
      console.log("Error in dnsChecker", error);
      return {
        status: DOWN,
        latency: 0,
        type: REALTIME,
      };
    }
  }
}

export default DnsCall;
