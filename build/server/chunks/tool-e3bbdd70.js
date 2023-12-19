import 'moment';

process.env.PUBLIC_KENER_FOLDER;
process.env.GH_TOKEN;
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
const GetDayStartTimestampUTC = function(timestamp) {
  const now = new Date(timestamp * 1e3);
  const dayStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
  const dayStartTimestamp = dayStart.getTime();
  return Math.floor(dayStartTimestamp / 1e3);
};

export { GetDayStartTimestampUTC as G, GetMinuteStartNowTimestampUTC as a, GetNowTimestampUTC as b, GetMinuteStartTimestampUTC as c };
//# sourceMappingURL=tool-e3bbdd70.js.map
