// @ts-nocheck
import { monitorsStore } from "$lib/server/stores/monitors";
import fs from "fs-extra";
import { StatusColor } from "$lib/helpers.js";
import { makeBadge } from "badge-maker";
import { get } from "svelte/store";

let monitors = get(monitorsStore);

export async function GET({ params, setHeaders, url }) {
	// @ts-ignore
	const { path0Day, name } = monitors.find((monitor) => monitor.tag === params.tag);
	const dayData = JSON.parse(fs.readFileSync(path0Day, "utf8"));
	const lastObj = dayData[Object.keys(dayData)[Object.keys(dayData).length - 1]];

	//read query params
	const query = url.searchParams;
	const labelColor = query.get("labelColor") || "#333";
	const color = query.get("color") || StatusColor[lastObj.status];
	const style = query.get("style") || "flat";

	const format = {
		label: name,
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
