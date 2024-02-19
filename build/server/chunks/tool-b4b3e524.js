process.env.PUBLIC_KENER_FOLDER;
process.env.NODE_ENV;
const GetNowTimestampUTC = function() {
  const now = /* @__PURE__ */ new Date();
  const timestamp = now.getTime();
  return Math.floor(timestamp / 1e3);
};
const GetMinuteStartTimestampUTC = function(timestamp) {
  const now = new Date(timestamp * 1e3);
  const minuteStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), 0, 0);
  const minuteStartTimestamp = minuteStart.getTime();
  return Math.floor(minuteStartTimestamp / 1e3);
};
const GetMinuteStartNowTimestampUTC = function() {
  const now = /* @__PURE__ */ new Date();
  const minuteStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), 0, 0);
  const minuteStartTimestamp = minuteStart.getTime();
  return Math.floor(minuteStartTimestamp / 1e3);
};
const BeginingOfDay = (options = {}) => {
  const { date = /* @__PURE__ */ new Date(), timeZone } = options;
  const parts = Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    hour: "numeric",
    minute: "numeric",
    second: "numeric"
  }).formatToParts(date);
  const hour = parseInt(parts.find((i) => i.type === "hour").value);
  const minute = parseInt(parts.find((i) => i.type === "minute").value);
  const second = parseInt(parts.find((i) => i.type === "second").value);
  const dt = new Date(1e3 * Math.floor((date - hour * 36e5 - minute * 6e4 - second * 1e3) / 1e3));
  return dt.getTime() / 1e3;
};

export { BeginingOfDay as B, GetNowTimestampUTC as G, GetMinuteStartTimestampUTC as a, GetMinuteStartNowTimestampUTC as b };
//# sourceMappingURL=tool-b4b3e524.js.map
