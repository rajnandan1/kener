import { GetMonitors, GetLatestMonitoringData, GetLatestStatusActiveAll } from "$lib/server/controllers/controller.js";
import StatusColor, { type StatusColors } from "$lib/color.js";
import { ErrorSvg } from "$lib/anywhere.js";
import GC, { type StatusType } from "$lib/global-constants.js";
import { GetLastMonitoringValue } from "$lib/server/cache/setGet.js";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params, url }) => {
  let lastObj: { status: string };
  const { tag } = params;
  if (tag == "_") {
    lastObj = await GetLatestStatusActiveAll();
  } else {
    const ms = await GetMonitors({ tag: params.tag, status: "ACTIVE", is_hidden: "NO" });
    if (ms.length === 0) {
      return new Response(ErrorSvg, {
        headers: {
          "Content-Type": "image/svg+xml",
        },
      });
    }
    lastObj = (await GetLastMonitoringValue(tag, () => GetLatestMonitoringData(tag))) as { status: string };
  }
  //read query params
  const query = url.searchParams;
  const animate = query.get("animate") || "";
  const myColors: StatusColors = await StatusColor();
  const statusToMap = (lastObj?.status as StatusType) || GC.NO_DATA;

  const fillColor = query.get("fillColor") || myColors[statusToMap];
  let svg = `
	<svg width="32" height="32"  xmlns="http://www.w3.org/2000/svg">
		<circle cx="16" cy="16" r="8" fill="${fillColor}" />
	</svg>
	`;
  if (animate == "ping") {
    svg = `
	<svg width="32" height="32"  xmlns="http://www.w3.org/2000/svg">
		<circle cx="16" cy="16" r="8" fill="${fillColor}" opacity="0.5">
			<animate 
				attributeName="r" 
				from="8" 
				to="16" 
				dur="1s" 
				repeatCount="indefinite" />
			<animate 
				attributeName="opacity" 
				from="0.5" 
				to="0" 
				dur="1s" 
				repeatCount="indefinite" />
		</circle>
		<circle cx="16" cy="16" r="8" fill="${fillColor}" />
</svg>
	`;
  }

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
    },
  });
};
