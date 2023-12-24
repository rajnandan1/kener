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
  return String((up / all * parseFloat(100)).toFixed(4));
};
const ParsePercentage = function(n) {
  if (isNaN(n))
    return "-";
  if (n == 0) {
    return "0";
  }
  if (n == 100) {
    return "100";
  }
  return n.toFixed(4);
};
const Badge = function(left, right, color) {
  const leftWidth = left.length * 10;
  const rightWidth = right.length * 12.5 + 10;
  const totalWidth = leftWidth + rightWidth - 5;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="18">
		<linearGradient id="smooth" x2="0" y2="100%">
			<stop offset="0"  stop-color="#fff" stop-opacity=".7"/>
			<stop offset=".1" stop-color="#aaa" stop-opacity=".1"/>
			<stop offset=".9" stop-color="#000" stop-opacity=".3"/>
			<stop offset="1"  stop-color="#000" stop-opacity=".5"/>
		</linearGradient>

		<mask id="round">
			<rect width="${totalWidth}" height="18" rx="4" fill="#fff"/>
		</mask>

		<g mask="url(#round)">
			<rect width="${leftWidth}" height="18" fill="#555"/>
			<rect x="${leftWidth}" width="${rightWidth}" height="18" fill="#${color}"/>
			<rect width="${totalWidth}" height="18" fill="url(#smooth)"/>
		</g>

		<g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="12">
			<text x="${leftWidth / 2 + 1}" y="14" fill="#010101" fill-opacity=".3">${left}</text>
			<text x="${leftWidth / 2 + 1}" y="13">${left}</text>
			<text x="${leftWidth + rightWidth / 2.5 - 1}" y="14" fill="#010101" fill-opacity=".3">${right}</text>
			<text x="${leftWidth + rightWidth / 2.5 - 1}" y="13">${right}</text>
		</g>
		</svg>
		`;
};

export { Badge as B, ParseUptime as P, StatusObj as S, ParsePercentage as a, StatusColor as b };
//# sourceMappingURL=helpers-eac5677c.js.map
