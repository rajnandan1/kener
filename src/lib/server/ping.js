// @ts-nocheck
import net from "net"; // Use import instead of require

/**
 * Check if a TCP port is open on a given IPv4/IPv6 host and measure latency.
 *
 * @param {string} host - The IP address or hostname (IPv4 or IPv6) to check.
 * @param {number} port - The port number to check.
 * @param {number} timeout - Connection timeout in milliseconds.
 * @returns {Promise<{ status: string, latency: number }>} - Resolves to an object with status ("open" or "closed") and latency in ms.
 */
const Ping = function (host, port, timeout = 3000) {
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
				resolve({ status, latency });
			}
		};

		socket.setTimeout(timeout);
		socket.once("connect", () => onFinish("open"));
		socket.once("timeout", () => onFinish("timeout"));
		socket.once("error", () => onFinish("error"));

		// Check if it's an IPv6 address (contains ':')
		const options = host.includes(":") ? { host, port, family: 6 } : { host, port };
		socket.connect(options);
	});
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

export { Ping, ExtractIPv6HostAndPort };
