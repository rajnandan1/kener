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
const ParseUptime = function(up, all) {
  if (all === 0)
    return String("-");
  if (up == 0)
    return String("0");
  if (up == all) {
    return String((up / all * parseFloat(100)).toFixed(0));
  }
  if (up / all * 100 % 10 == 0) {
    return String((up / all * parseFloat(100)).toFixed(0));
  }
  return String((up / all * parseFloat(100)).toFixed(4));
};

export { ParseUptime as P, StatusObj as S, StatusColor as a };
//# sourceMappingURL=helpers-0acb6e43.js.map
