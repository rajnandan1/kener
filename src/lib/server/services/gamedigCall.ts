import GC from "../../global-constants.js";
// @ts-expect-error - gamedig does not have type declarations
import { GameDig } from "gamedig";
import { DefaultGamedigEval, GAMEDIG_SOCKET_TIMEOUT, GAMEDIG_TIMEOUT } from "../../anywhere.js";
import type { GamedigMonitor, MonitoringResult, EvalResponse } from "../types/monitor.js";

class GamedigCall {
  monitor: GamedigMonitor;

  constructor(monitor: GamedigMonitor) {
    this.monitor = monitor;
  }

  async execute(): Promise<MonitoringResult> {
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
    } catch (error: unknown) {
      let errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.length > 200) {
        errorMessage = errorMessage.substring(0, 200) + "...";
      }
      console.log(`Error while requesting game's information for ${tag}: `, errorMessage);
      return {
        status: GC.DOWN,
        latency: 0,
        type: GC.ERROR,
        error_message: errorMessage,
      };
    }

    // Eval
    let evalResp: EvalResponse | undefined = undefined;
    const evalFunction = new Function(
      "responseTime",
      "responseRaw",
      `return (${gamedigEval})(responseTime, responseRaw);`,
    );
    try {
      evalResp = await evalFunction(responseTime, responseRaw);
    } catch (error: unknown) {
      let errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.length > 200) {
        errorMessage = errorMessage.substring(0, 200) + "...";
      }
      console.log(`Error in gamedigEval for ${tag}: `, errorMessage);
      return {
        status: GC.DOWN,
        latency: 0,
        type: GC.ERROR,
        error_message: errorMessage,
      };
    }

    // Result
    return {
      status: evalResp?.status || GC.DOWN,
      latency: evalResp?.latency || 0,
      type: GC.REALTIME,
    };
  }
}

export default GamedigCall;
