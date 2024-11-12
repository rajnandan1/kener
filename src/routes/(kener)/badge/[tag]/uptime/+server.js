// @ts-nocheck
import { monitorsStore } from "$lib/server/stores/monitors";
import fs from "fs-extra";
import { ParseUptime } from "$lib/helpers.js";
import { makeBadge } from "badge-maker";
import { get } from "svelte/store";

let monitors = get(monitorsStore);
export async function GET({ params, url }) {
	// @ts-ignore
	const { path0Day, name } = monitors.find((monitor) => monitor.tag === params.tag);
	const dayData = JSON.parse(fs.readFileSync(path0Day, "utf8"));
	const query = url.searchParams;
	const rangeInSeconds = query.get("sinceLast") || 90 * 24 * 60 * 60;
	const now = Math.floor(Date.now() / 1000);
	const since = now - rangeInSeconds;

	//add all status up, degraded, down
	let ups = 0;
	let downs = 0;
	let degradeds = 0;

	for (const timestamp in dayData) {
		if (timestamp < since) {
			continue;
		}
		const obj = dayData[timestamp];
		if (obj.status == "UP") {
			ups++;
		} else if (obj.status == "DEGRADED") {
			degradeds++;
		} else if (obj.status == "DOWN") {
			downs++;
		}
	}

	let uptime = ParseUptime(ups + degradeds, ups + degradeds + downs) + "%";

	const labelColor = query.get("labelColor") || "#333";
	const color = query.get("color") || "#0079FF";
	const style = query.get("style") || "flat";

	const format = {
		label: name,
		message: uptime,
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
