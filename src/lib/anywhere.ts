export const DefaultAPIEval = `async function (statusCode, responseTime, responseRaw, modules) {
	let statusCodeShort = Math.floor(statusCode/100);
    if(statusCode == 429 || (statusCodeShort >=2 && statusCodeShort <= 3)) {
        return {
			status: 'UP',
			latency: responseTime,
        }
    } 
	return {
		status: 'DOWN',
		latency: responseTime,
	}
}`;

export const DefaultPingEval = `async function (arrayOfPings) {
	let latencyTotal = arrayOfPings.reduce((acc, ping) => {
		return acc + ping.latency;
	}, 0);

	let alive = arrayOfPings.reduce((acc, ping) => {
		return acc && ping.alive;
	}, true);

	return {
		status: alive ? 'UP' : 'DOWN',
		latency: latencyTotal / arrayOfPings.length,
	}
}`;

export const DefaultTCPEval = `async function (arrayOfPings) {
	let latencyTotal = arrayOfPings.reduce((acc, ping) => {
		return acc + ping.latency;
	}, 0);

	let alive = arrayOfPings.reduce((acc, ping) => {
		return acc && ping.status === "open";
	}, true);

	return {
		status: alive ? 'UP' : 'DOWN',
		latency: latencyTotal / arrayOfPings.length,
	}
}`;

export const DefaultGamedigEval = `async function (responseTime, responseRaw) {
	return {
		status: 'UP',
		latency: responseTime,
	}
}`;
export const GAMEDIG_TIMEOUT = 10 * 1000; // 10 seconds
export const GAMEDIG_SOCKET_TIMEOUT = 2 * 1000; // 2 seconds

// ---- Docker monitors ----------------------------------------------------

/** Transports the Docker Engine API can be reached over. */
export const DOCKER_CONNECTION_TYPES = ["socket", "tcp", "tls"] as const;
export type DockerConnectionType = (typeof DOCKER_CONNECTION_TYPES)[number];

/** What a DOCKER monitor watches: a single container, or the daemon itself. */
export const DOCKER_CHECK_TYPES = ["container", "daemon"] as const;
export type DockerCheckType = (typeof DOCKER_CHECK_TYPES)[number];

export const DOCKER_DEFAULT_TIMEOUT = 10 * 1000; // 10 seconds
export const DOCKER_DEFAULT_SOCKET_PATH = "/var/run/docker.sock";

// Outbound HTTP proxy for API/Prometheus monitors (type_data.proxy). Node silently ignores a
// proxy URL whose scheme is not exactly `http://` or `https://` (uppercase included) and throws
// ERR_PROXY_INVALID_CONFIG on a malformed authority, either way at check time rather than at
// save. Both are caught here. Takes `unknown` because type_data is parsed JSON, so the value
// need not be a string. `$SECRET` tokens survive the parse: `$` is legal in a host and userinfo.
export function IsValidProxyURL(proxy: unknown): boolean {
  if (typeof proxy !== "string") return false;
  const value = proxy.trim();
  if (!value.startsWith("http://") && !value.startsWith("https://")) return false;
  try {
    // Rejects a bad port, an empty host, an unclosed IPv6 literal. A special scheme with an
    // empty host is unparseable, so a host check after this would never fire.
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export const ErrorSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60" viewBox="0 0 120 60" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="30" cy="24" r="10"/>
  <path d="M26 27h8"/>
  <path d="M26 21h2"/>
  <path d="M32 21h2"/>
  <text x="80" y="29" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" fill="currentColor" font-weight="300">Not Found</text>
</svg>`;
