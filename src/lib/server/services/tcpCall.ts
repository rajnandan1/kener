import { TCP } from "../ping.js";
import GC from "../../global-constants.js";
import { DefaultTCPEval } from "../../anywhere.js";
import type { TcpMonitor, MonitoringResult, EvalResponse } from "../types/monitor.js";

class TcpCall {
  monitor: TcpMonitor;

  constructor(monitor: TcpMonitor) {
    this.monitor = monitor;
  }

  async execute(): Promise<MonitoringResult> {
    let hosts = this.monitor.type_data.hosts;
    let tcpEval = !!this.monitor.type_data.tcpEval ? this.monitor.type_data.tcpEval : DefaultTCPEval;
    let tag = this.monitor.tag;

    if (hosts === undefined) {
      const message =
        "Hosts is undefined. The TCP monitor has changed in version 3.0.10. Please update your monitor with tag " + tag;
      console.log(
        "Hosts is undefined. The TCP monitor has changed in version 3.0.10. Please update your monitor with tag",
        tag,
      );
      return {
        status: GC.DOWN,
        latency: 0,
        type: GC.ERROR,
        error_message: message,
      };
    }
    let arrayOfPings = [];
    let errorMessages: string[] = [];
    for (let i = 0; i < hosts.length; i++) {
      const host = hosts[i];
      const result = await TCP(host.type, host.host, host.port, host.timeout);
      if (result.status !== "open") {
        errorMessages.push(`Host ${host.host}:${host.port} is ${result.status}`);
      }
      arrayOfPings.push(result);
    }

    let evalResp: EvalResponse | undefined = undefined;

    try {
      const evalFunction = new Function("arrayOfPings", `return (${tcpEval})(arrayOfPings);`);
      evalResp = await evalFunction(arrayOfPings);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`Error in tcpEval for ${tag}`, message);
      return {
        status: GC.DOWN,
        latency: 0,
        type: GC.ERROR,
        error_message: `Error in tcpEval: ${message}`,
      };
    }
    if (!!!evalResp) {
      const message = "tcpEval did not return a valid response.";
      console.log(`Error in tcpEval for ${tag}:`, message);
      return {
        status: GC.DOWN,
        latency: 0,
        type: GC.ERROR,
        error_message: `Error in tcpEval: ${message}`,
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

export default TcpCall;
