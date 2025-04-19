// @ts-nocheck
import { error } from "@sveltejs/kit";
import { UP, DOWN, DEGRADED, REALTIME, TIMEOUT, ERROR, MANUAL } from "../constants.js";
import { GameDig } from 'gamedig';

class GamedigCall {
  monitor;

  constructor(monitor) {
    this.monitor = monitor;
  }

  async execute() {
    const host = this.monitor.type_data.host;
    const port = this.monitor.type_data.port;
    try {
      const { ping } = await GameDig.query({
        type: this.monitor.type_data.gameId,
        host: host,
        port: port,
        givenPortOnly: !this.monitor.type_data.guessPort,
        requestRules: this.monitor.type_data.requestRules,
      });
      
      // TODO: eval function.
      return {
        status: UP,
        latency: ping,
        type: REALTIME
      }
    } catch (err) {
      console.log(`Error while requesting game's information for ${host}:${port}: `, err.message);
      return {
        status: DOWN,
        latency: 0,
        type: ERROR,
      };
    }
  }
}

export default GamedigCall;
