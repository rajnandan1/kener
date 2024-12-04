// @ts-nocheck
import { monitorsStore } from "$lib/server/stores/monitors";
import { ParseUptime, GetMinuteStartNowTimestampUTC } from "$lib/server/tool.js";
import { makeBadge } from "badge-maker";
import { get } from "svelte/store";
import moment from "moment";
import db from "$lib/server/db/db.js";

let monitors = get(monitorsStore);
export async function GET({ params, url }) {
	// @ts-ignore
	const { name, tag, includeDegradedInDowntime } = monitors.find(
		(monitor) => monitor.tag === params.tag
	);
	const query = url.searchParams;
	let sinceLast = query.get("sinceLast");
	if (sinceLast == undefined || isNaN(sinceLast) || sinceLast < 60) {
		sinceLast = 90 * 24 * 60 * 60;
	}
	const rangeInSeconds = sinceLast;
	const now = Math.floor(Date.now() / 1000);
	const since = GetMinuteStartNowTimestampUTC() - rangeInSeconds;
	let label = query.get("label") || name;
	const hideDuration = query.get("hideDuration") === "true";

	//add all status up, degraded, down
	let ups = 0;
	let downs = 0;
	let degradeds = 0;

	const duration = moment.duration(rangeInSeconds, "seconds");
	let formatted = "";
	if (duration.days() > 0 || duration.minutes() < 1) {
		formatted = `${Math.floor(rangeInSeconds / 86400)}d`;
	} else if (duration.hours() > 0) {
		formatted = `${duration.hours()}h`;
	} else if (duration.minutes() > 0) {
		formatted = `${duration.minutes()}m`;
	}

	let dbData = await db.getAggregatedData(tag, since, now);
	dbData.UP = Number(dbData.UP);
	dbData.DOWN = Number(dbData.DOWN);
	dbData.DEGRADED = Number(dbData.DEGRADED);
	let numerator = dbData.UP + dbData.DEGRADED;
	let denominator = dbData.UP + dbData.DEGRADED + dbData.DOWN;
	if (includeDegradedInDowntime === true) {
		numerator = dbData.UP;
	}

	let uptime = ParseUptime(numerator, denominator) + "%";

	const labelColor = query.get("labelColor") || "#333";
	const color = query.get("color") || "#0079FF";
	const style = query.get("style") || "flat";

	label = label + (hideDuration ? "" : ` ${formatted}`);
	label = label.trim();

	const format = {
		label: label,
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
