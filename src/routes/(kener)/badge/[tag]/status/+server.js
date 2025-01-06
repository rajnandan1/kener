// @ts-nocheck
import { GetMonitors } from "$lib/server/controllers/controller.js";
import StatusColor from "$lib/color.js";
import { makeBadge } from "badge-maker";
import db from "$lib/server/db/db.js";

export async function GET({ params, setHeaders, url }) {
	// @ts-ignore
	let monitors = await GetMonitors({ status: "ACTIVE" });
	const { tag, name } = monitors.find((monitor) => monitor.tag === params.tag);
	const lastObj = await db.getLatestMonitoringData(tag);

	//read query params
	let myColors = await StatusColor();
	const query = url.searchParams;
	const labelColor = query.get("labelColor") || "#333";
	let label = query.get("label") || name;
	const color = query.get("color") || myColors[lastObj.status].substr(1);
	const style = query.get("style") || "flat";

	label = label.trim();

	const format = {
		label: label,
		message: lastObj.status,
		color: color,
		labelColor: labelColor,
		style: style
	};
	const svg = makeBadge(format);

	return new Response(svg, {
		headers: {
			"Content-Type": "image/svg+xml"
		}
	});
}
