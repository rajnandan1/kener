import DNSResolver from "../dns.js";
import { UP, DOWN, DEGRADED, REALTIME, TIMEOUT, ERROR, MANUAL } from "../constants.js";
import type { NoneMonitor, MonitoringResult } from "../types/monitor.js";

class NoneCall {
  monitor: NoneMonitor;

  constructor(monitor: NoneMonitor) {
    this.monitor = monitor;
  }

  async execute(): Promise<null> {
    return null;
  }
}

export default NoneCall;
