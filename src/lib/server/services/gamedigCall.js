// @ts-nocheck
import { UP, DOWN, DEGRADED, REALTIME, TIMEOUT, ERROR, MANUAL } from "../constants.js";
import { GameDig } from 'gamedig';
import { DefaultGamedigEval, GAMEDIG_SOCKET_TIMEOUT, GAMEDIG_TIMEOUT } from "../../anywhere.js";

class GamedigCall {
  monitor;

  constructor(monitor) {
    this.monitor = monitor;
  }

  async execute() {
    const tag = this.monitor.tag;
    const host = this.monitor.type_data.host;
    const port = this.monitor.type_data.port;
    const timeout = !!this.monitor.type_data.timeout ? this.monitor.type_data.timeout : GAMEDIG_TIMEOUT;
    const gamedigEval = !!this.monitor.type_data.eval ? this.monitor.type_data.eval : DefaultGamedigEval;

    // Query
    let responseTime, responseRaw;
    try {
      const response = await GameDig.query({
        type: this.monitor.type_data.gameId,
        host: host,
        port: port,
        socketTimeout: GAMEDIG_SOCKET_TIMEOUT,
        attemptTimeout: timeout,
        givenPortOnly: !this.monitor.type_data.guessPort,
        requestRules: this.monitor.type_data.requestRules,
      });

      responseTime = response.ping;
      responseRaw = response.raw;
    } catch (error) {
      console.log(`Error while requesting game's information for ${tag}: `, error.message);
      return {
        status: DOWN,
        latency: 0,
        type: ERROR,
      };
    }

    // Eval
    let evalResp = undefined;
    const evalFunction = new Function("responseTime", "responseRaw", `return (${gamedigEval})(responseTime, responseRaw);`);
    try {
      evalResp = await evalFunction(responseTime, responseRaw);
    } catch (error) {
      console.log(`Error in gamedigEval for ${tag}: `, error.message);
      return {
        status: DOWN,
        latency: 0,
        type: ERROR,
      };
    }

    // Result
    return {
      status: evalResp.status,
      latency: evalResp.latency,
      type: REALTIME,
    };
  }
}

export default GamedigCall;
