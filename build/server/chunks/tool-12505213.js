import 'moment';

process.env.PUBLIC_KENER_FOLDER;
process.env.GH_TOKEN;
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

export { GetDayStartTimestampUTC as G, GetMinuteStartNowTimestampUTC as a };
//# sourceMappingURL=tool-12505213.js.map
