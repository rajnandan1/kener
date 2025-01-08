// @ts-nocheck
// @ts-ignore
import { json } from "@sveltejs/kit";
import { auth, GHIssueToKenerIncident } from "$lib/server/webhook";

export async function POST({ request, params }) {
	const payload = await request.json();
	const incident_number = params.incident_number; //number required
	// const headers = await request.headers();
	const authError = await auth(request);
	if (authError !== null) {
		return json(
			{ error: authError.message },
			{
				status: 401
			}
		);
	}

	let isIdentified = payload.isIdentified; //string required and can be resolved or identified
	let isResolved = payload.isResolved; //string required and can be resolved or identified
	let endDatetime = payload.endDatetime; //in utc seconds optional

	// Perform validations
	if (!incident_number || isNaN(incident_number)) {
		return json(
			{ error: "Invalid incident_number" },
			{
				status: 400
			}
		);
	}

	if (endDatetime && typeof endDatetime !== "number") {
		return json(
			{ error: "Invalid endDatetime" },
			{
				status: 400
			}
		);
	}

	let issue = null;
	if (issue === null) {
		return json(
			{ error: "github error" },
			{
				status: 400
			}
		);
	}
	let labels = issue.labels.map((label) => {
		return label.name;
	});
	if (isIdentified !== undefined) {
		labels = labels.filter((label) => label !== "identified");
		if (isIdentified === true) {
			labels.push("identified");
		}
	}
	if (isResolved !== undefined) {
		labels = labels.filter((label) => label !== "resolved");
		if (isResolved === true) {
			labels.push("resolved");
		}
	}

	let body = issue.body;
	if (endDatetime) {
		body = body.replace(/\[end_datetime:(\d+)\]/g, "");
		body = body.trim();
		body = body + " " + `[end_datetime:${endDatetime}]`;
	}

	let resp = null;
	if (resp === null) {
		return json(
			{ error: "github error" },
			{
				status: 400
			}
		);
	}
	return json(await GHIssueToKenerIncident(resp), {
		status: 200
	});
}
