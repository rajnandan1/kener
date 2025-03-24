// @ts-nocheck
import axios from "axios";
import { TCP } from "../ping.js";
import { UP, DOWN, DEGRADED, REALTIME, TIMEOUT, ERROR, MANUAL } from "../constants.js";
import { DefaultTCPEval } from "../../anywhere.js";

class TcpCall {
  monitor;

  constructor(monitor) {
    this.monitor = monitor;
  }

  async execute() {
    let hosts = this.monitor.type_data.hosts;
    let tcpEval = !!this.monitor.type_data.tcpEval ? this.monitor.type_data.tcpEval : DefaultTCPEval;
    let tag = this.monitor.tag;

    if (hosts === undefined) {
      console.log(
        "Hosts is undefined. The ping monitor has changed in version 3.0.10. Please update your monitor with tag",
        tag,
      );
      return {
        status: DOWN,
        latency: 0,
        type: ERROR,
      };
    }
    let arrayOfPings = [];
    for (let i = 0; i < hosts.length; i++) {
      const host = hosts[i];
      arrayOfPings.push(await TCP(host.type, host.host, host.port, host.timeout));
    }

    let evalResp = undefined;

    try {
      const evalFunction = new Function("arrayOfPings", `return (${tcpEval})(arrayOfPings);`);
      evalResp = await evalFunction(arrayOfPings);
    } catch (error) {
      console.log(`Error in tcpEval for ${tag}`, error.message);
      return {
        status: DOWN,
        latency: 0,
        type: ERROR,
      };
    }
    //reduce to get the status
    return {
      status: evalResp.status,
      latency: evalResp.latency,
      type: REALTIME,
    };
  }
}

export default TcpCall;
