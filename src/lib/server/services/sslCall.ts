import tls from "tls";
import GC from "../../global-constants.js";
import type { SslMonitor, MonitoringResult } from "../types/monitor.js";

interface SSLExpiryResult {
  domain: string;
  expiryDate: Date;
  timeTillExpiryMs: number;
  latency: number;
}

const getSSLExpiry = (domain: string, port: number = 443): Promise<SSLExpiryResult> => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const socket = tls.connect(port, domain, { servername: domain }, () => {
      const { valid_to } = socket.getPeerCertificate();
      if (!valid_to) {
        reject(new Error("No certificate found."));
        return;
      }
      const latency = Date.now() - startTime;
      const timeTillExpiryMs = new Date(valid_to).getTime() - new Date().getTime();
      resolve({
        domain,
        expiryDate: new Date(valid_to),
        timeTillExpiryMs,
        latency,
      });
      socket.end();
    });

    socket.on("error", (err) => reject(err));
  });
};

class SSLCall {
  monitor: SslMonitor;

  constructor(monitor: SslMonitor) {
    this.monitor = monitor;
  }

  async execute(): Promise<MonitoringResult> {
    let domain = this.monitor.type_data.host;
    let port = parseInt(this.monitor.type_data.port || "443");
    let degradedRemainingHours = Number(this.monitor.type_data.degradedRemainingHours);
    let downRemainingHours = Number(this.monitor.type_data.downRemainingHours);
    try {
      const { timeTillExpiryMs, latency } = await getSSLExpiry(domain, port);
      const timeTillExpiryHours = timeTillExpiryMs / 1000 / 60 / 60;
      if (timeTillExpiryHours > degradedRemainingHours) {
        return {
          status: GC.UP,
          latency: latency,
          type: GC.REALTIME,
        };
      } else if (timeTillExpiryHours > downRemainingHours) {
        return {
          status: GC.DEGRADED,
          latency: latency,
          type: GC.REALTIME,
        };
      } else {
        return {
          status: GC.DOWN,
          latency: latency,
          type: GC.REALTIME,
        };
      }
    } catch (error: unknown) {
      console.log(`Error checking SSL for ${domain}:`, (error as Error).message);
      return {
        status: GC.DOWN,
        latency: 0,
        type: GC.ERROR,
      };
    }
  }
}

export default SSLCall;
