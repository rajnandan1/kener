import {
  GetMonitors,
  GetLatestMonitoringData,
  GetLatestStatusActiveAll,
  GetSiteDataByKey,
} from "$lib/server/controllers/controller.js";
import StatusColor, { type StatusColors } from "$lib/color.js";
import { makeBadge } from "badge-maker";
import { ErrorSvg } from "$lib/anywhere.js";
import GC, { getBadgeStyle, type StatusType } from "$lib/global-constants.js";
import { GetLastMonitoringValue } from "$lib/server/cache/setGet.js";

export async function GET({ params, setHeaders, url }) {
  let lastObj;
  let name: string;
  let tag: string;

  const siteName = await GetSiteDataByKey("siteName");
  if (params.tag == "_") {
    lastObj = await GetLatestStatusActiveAll();
    name = String(siteName || "");
    tag = "";
  } else {
    const ms = await GetMonitors({ tag: params.tag, status: "ACTIVE", is_hidden: "NO" });
    if (ms.length === 0) {
      return new Response(ErrorSvg, {
        headers: {
          "Content-Type": "image/svg+xml",
        },
      });
    }
    const m = ms[0];
    tag = m.tag;
    name = m.name;
    lastObj = (await GetLastMonitoringValue(tag, () => GetLatestMonitoringData(tag))) as { status: string };
  }

  //read query params
  const myColors: StatusColors = await StatusColor();
  const statusToMap = (lastObj?.status as StatusType) || GC.NO_DATA;
  const query = url.searchParams;
  const fillColor = query.get("fillColor") || myColors[statusToMap];

  const labelColor = query.get("labelColor") || "333";
  let label: string = query.get("label") || name;
  const color = query.get("color") || fillColor.substring(1);
  const style = getBadgeStyle(query.get("style"));

  label = label.trim();

  const format = {
    label: label,
    message: statusToMap,
    color: color,
    labelColor: labelColor,
    style: style,
  };
  const svg = makeBadge(format);

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
    },
  });
}
