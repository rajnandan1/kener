import { Ping } from "../ping.js";
import GC from "../../global-constants.js";
import { DefaultPingEval } from "../../anywhere.js";
import type { PingMonitor, MonitoringResult, EvalResponse } from "../types/monitor.js";

class PingCall {
  monitor: PingMonitor;

  constructor(monitor: PingMonitor) {
    this.monitor = monitor;
  }

  async execute(): Promise<MonitoringResult> {
    let hosts = this.monitor.type_data.hosts;
    let pingEval = !!this.monitor.type_data.pingEval ? this.monitor.type_data.pingEval : DefaultPingEval;
    let tag = this.monitor.tag;
    if (hosts === undefined) {
      return {
        status: GC.DOWN,
        latency: 0,
        type: GC.ERROR,
        error_message:
          "Hosts is undefined. The ping monitor has changed in version 3.0.10. Please update your monitor with tag " +
          tag,
      };
    }
    let arrayOfPings = [];
    let errorMessages: string[] = [];
    for (let i = 0; i < hosts.length; i++) {
      const host = hosts[i];
      const result = await Ping(host.type, host.host, host.timeout, host.count);
      if (!result.alive) {
        errorMessages.push(`Host ${host.host} is unreachable.`);
      }
      arrayOfPings.push(result);
    }
    let evalResp: EvalResponse | undefined = undefined;

    try {
      const evalFunction = new Function("arrayOfPings", `return (${pingEval})(arrayOfPings);`);
      evalResp = await evalFunction(arrayOfPings);
    } catch (error: unknown) {
      console.log(`Error in pingEval for ${tag}`, (error as Error).message);
      return {
        status: GC.DOWN,
        latency: 0,
        type: GC.ERROR,
        error_message: `Error in pingEval: ${(error as Error).message}`,
      };
    }

    //reduce to get the status
    return {
      status: evalResp?.status || GC.DOWN,
      latency: evalResp?.latency || 0,
      type: GC.REALTIME,
      error_message: errorMessages.length > 0 ? errorMessages.join("; ") : undefined,
    };
  }
}

export default PingCall;
