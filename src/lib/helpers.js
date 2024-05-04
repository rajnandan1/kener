// @ts-nocheck
const StatusObj = {
	UP: "api-up",
	DEGRADED: "api-degraded",
	DOWN: "api-down",
	NO_DATA: "api-nodata"
};
const StatusColor = {
	UP: "00dfa2",
	DEGRADED: "ffb84c",
	DOWN: "ff0060",
	NO_DATA: "b8bcbe"
};
// @ts-ignore
const ParseUptime = function (up, all) {
	if (all === 0) return String("-");
	if (up == 0) return String("0");
	if (up == all) {
		return String(((up / all) * parseFloat(100)).toFixed(0));
	}
	//return 50% as 50% and not 50.0000%
	if (((up / all) * 100) % 10 == 0) {
		return String(((up / all) * parseFloat(100)).toFixed(0));
	}
	return String(((up / all) * parseFloat(100)).toFixed(4));
};
const ParsePercentage = function (n) {
	if (isNaN(n)) return "-";
	if (n == 0) {
		return "0";
	}
	if (n == 100) {
		return "100";
	}
	return n.toFixed(4);
};
export { StatusObj, StatusColor, ParseUptime, ParsePercentage };
