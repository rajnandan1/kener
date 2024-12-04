// @ts-nocheck
import { monitorsStore } from "$lib/server/stores/monitors";
import { StatusColor } from "$lib/color.js";
import { makeBadge } from "badge-maker";
import { get } from "svelte/store";
import db from "$lib/server/db/db.js";

let monitors = get(monitorsStore);

export async function GET({ params, setHeaders, url }) {
	// @ts-ignore
	const { tag, name } = monitors.find((monitor) => monitor.tag === params.tag);
	const lastObj = await db.getLatestData(tag);

	//read query params
	const query = url.searchParams;
	const labelColor = query.get("labelColor") || "#333";
	let label = query.get("label") || name;
	const color = query.get("color") || StatusColor[lastObj.status].substr(1);
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
