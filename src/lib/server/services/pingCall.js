// @ts-nocheck
import axios from "axios";
import { Ping } from "../ping.js";
import { UP, DOWN, DEGRADED, REALTIME, TIMEOUT, ERROR, MANUAL } from "../constants.js";
import { DefaultPingEval } from "../../anywhere.js";

class PingCall {
  monitor;

  constructor(monitor) {
    this.monitor = monitor;
  }

  async execute() {
    let hosts = this.monitor.type_data.hosts;
    let pingEval = !!this.monitor.type_data.pingEval ? this.monitor.type_data.pingEval : DefaultPingEval;
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
      arrayOfPings.push(await Ping(host.type, host.host, host.timeout, host.count));
    }

    let evalResp = undefined;

    try {
      const evalFunction = new Function("arrayOfPings", `return (${pingEval})(arrayOfPings);`);
      evalResp = await evalFunction(arrayOfPings);
    } catch (error) {
      console.log(`Error in pingEval for ${tag}`, error.message);
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

export default PingCall;
