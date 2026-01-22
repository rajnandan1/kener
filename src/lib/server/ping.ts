import net from "net"; // Use import instead of require
import ping from "ping";

interface TCPResult {
  status: "open" | "timeout" | "error";
  latency: number;
  host: string;
  port: number;
  type: string;
}

interface TCPSocketOptions {
  host: string;
  port: number;
  family: 4 | 6;
}

const TCP = function (type: string, host: string, port: string | number, timeout: number): Promise<TCPResult> {
  timeout = Number(timeout);
  port = parseInt(port as string, 10);
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const start = process.hrtime.bigint(); // High-precision timestamp
    let resolved = false;

    const onFinish = (status: "open" | "timeout" | "error"): void => {
      if (!resolved) {
        resolved = true;
        const end = process.hrtime.bigint();
        const latency = Number(end - start) / 1e6; // Convert nanoseconds to milliseconds
        socket.destroy();
        resolve({ status, latency, host, port: port as number, type });
      }
    };

    socket.setTimeout(timeout);
    socket.once("connect", () => onFinish("open"));
    socket.once("timeout", () => onFinish("timeout"));
    socket.once("error", () => onFinish("error"));

    // Check if it's an IPv6 address (contains ':')
    const options: TCPSocketOptions = {
      host,
      port: port as number,
      family: type === "IP6" ? 6 : 4,
    }; //host.includes(":") ? { host, port, family: 6 } : { host, port };
    socket.connect(options);
  });
};

interface PingResult {
  alive: boolean;
  min: string | null;
  max: string | null;
  avg: string | null;
  latencies: string[];
  latency: string | number | null;
  host: string;
  type: string;
}

const Ping = async function (type: string, host: string, timeout: number, count: number): Promise<PingResult> {
  let output: PingResult = {
    alive: false,
    min: null,
    max: null,
    avg: null,
    latencies: [],
    latency: null,
    host: host,
    type: type,
  };

  try {
    let res = await ping.promise.probe(host, {
      v6: type === "IP6",
      timeout: type === "IP6" ? undefined : Math.floor(timeout / 1000),
      min_reply: count,
    });
    output.alive = res.alive;
    output.min = res.min;
    output.max = res.max;
    output.avg = res.avg;
    output.latencies = (res as unknown as { times?: string[] }).times ?? []; //sv5-verify
    output.latency = res.time;
  } catch (error) {
    console.log(`Error in pingCall IP4 for ${host}`, error);
  }
  return output;
};

/**
 * @param {string} input
 */
interface IPv6HostAndPort {
  host: string;
  port: number | null;
}

function ExtractIPv6HostAndPort(input: string): IPv6HostAndPort | null {
  const parts: string[] = input.split(":"); // Split by colons

  // If there's a valid port at the end, extract it
  const lastPart: string = parts[parts.length - 1];
  const port: number | null = /^\d+$/.test(lastPart) ? parseInt(parts.pop() as string, 10) : null; // Check if last part is a number

  // Reconstruct the IPv6 address
  const host: string = parts.join(":");

  // Ensure it's a valid IPv6 format
  if (host.includes(":")) {
    return { host, port }; // Port may be null if not present
  }
  return null; // Return null if the format is incorrect
}

export { TCP, ExtractIPv6HostAndPort, Ping };
