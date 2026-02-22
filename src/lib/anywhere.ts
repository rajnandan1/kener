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

export const ErrorSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60" viewBox="0 0 120 60" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="30" cy="24" r="10"/>
  <path d="M26 27h8"/>
  <path d="M26 21h2"/>
  <path d="M32 21h2"/>
  <text x="80" y="29" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" fill="currentColor" font-weight="300">Not Found</text>
</svg>`;
