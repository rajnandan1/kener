import { GetLastKnownStatus } from "../controllers/monitorsController.js";
import type { NoneMonitor, MonitoringResult } from "../types/monitor.js";
import GC from "../../global-constants.js";

class NoneCall {
  monitor: NoneMonitor;

  constructor(monitor: NoneMonitor) {
    this.monitor = monitor;
  }

  async execute(): Promise<MonitoringResult | null> {
    let overrideWithLastKnownStatus = this.monitor.type_data.overrideWithLastKnownStatus;
    if (!!overrideWithLastKnownStatus) {
      //get the last known status
      let lastKnownStatus = await GetLastKnownStatus(this.monitor.tag);
      if (
        !!lastKnownStatus &&
        !!lastKnownStatus.status &&
        !!lastKnownStatus.latency &&
        !!lastKnownStatus.type &&
        lastKnownStatus.type === GC.MANUAL
      ) {
        return {
          status: lastKnownStatus.status,
          latency: lastKnownStatus.latency,
          type: lastKnownStatus.type,
        };
      }
    }
    return null;
  }
}

export default NoneCall;
