// @ts-nocheck
import net from "net"; // Use import instead of require
import ping from "ping";

const TCP = function (type, host, port, timeout) {
  timeout = Number(timeout);
  port = parseInt(port, 10);
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const start = process.hrtime.bigint(); // High-precision timestamp
    let resolved = false;

    const onFinish = (status) => {
      if (!resolved) {
        resolved = true;
        const end = process.hrtime.bigint();
        const latency = Number(end - start) / 1e6; // Convert nanoseconds to milliseconds
        socket.destroy();
        resolve({ status, latency, host, port, type });
      }
    };

    socket.setTimeout(timeout);
    socket.once("connect", () => onFinish("open"));
    socket.once("timeout", () => onFinish("timeout"));
    socket.once("error", () => onFinish("error"));

    // Check if it's an IPv6 address (contains ':')
    const options = {
      host,
      port,
      family: type === "IP6" ? 6 : 4,
    }; //host.includes(":") ? { host, port, family: 6 } : { host, port };
    socket.connect(options);
  });
};

const Ping = async function (type, host, timeout, count) {
  let output = {
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
      timeout: type === "IP6" ? false : Math.floor(timeout / 1000),
      min_reply: count,
    });
    output.alive = res.alive;
    output.min = res.min;
    output.max = res.max;
    output.avg = res.avg;
    output.latencies = res.times;
    output.latency = res.time;
  } catch (error) {
    console.log(`Error in pingCall IP4 for ${host}`, error);
  }
  return output;
};

/**
 * @param {string} input
 */
function ExtractIPv6HostAndPort(input) {
  const parts = input.split(":"); // Split by colons

  // If there's a valid port at the end, extract it
  const lastPart = parts[parts.length - 1];
  const port = /^\d+$/.test(lastPart) ? parseInt(parts.pop(), 10) : null; // Check if last part is a number

  // Reconstruct the IPv6 address
  const host = parts.join(":");

  // Ensure it's a valid IPv6 format
  if (host.includes(":")) {
    return { host, port }; // Port may be null if not present
  }
  return null; // Return null if the format is incorrect
}

export { TCP, ExtractIPv6HostAndPort, Ping };
