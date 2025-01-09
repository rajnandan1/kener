// @ts-nocheck
// @ts-ignore
import { json } from "@sveltejs/kit";
import { auth } from "$lib/server/webhook";
import {
	GetIncidentMonitors,
	RemoveIncidentMonitor,
	AddIncidentMonitor
} from "$lib/server/controllers/controller.js";

export async function GET({ request, params }) {
	const authError = await auth(request);
	if (authError !== null) {
		return json(
			{ error: authError.message },
			{
				status: 401
			}
		);
	}
	const incident_id = params.incident_id; //number required

	try {
		let resp = await GetIncidentMonitors(incident_id);
		return json(resp, {
			status: 200
		});
	} catch (e) {
		return json(
			{ error: e.message },
			{
				status: 400
			}
		);
	}
}
export async function DELETE({ request, params, url }) {
	const authError = await auth(request);
	if (authError !== null) {
		return json(
			{ error: authError.message },
			{
				status: 401
			}
		);
	}
	const incident_id = params.incident_id; //number required
	const query = url.searchParams;

	const tag = query.get("tag"); //required

	if (!tag) {
		return json(
			{ error: "Invalid tag" },
			{
				status: 400
			}
		);
	}

	try {
		let resp = await RemoveIncidentMonitor(incident_id, tag);
		if (resp.changes == 0) {
			return json(
				{ error: "Monitor not found" },
				{
					status: 404
				}
			);
		}
		return json(await GetIncidentMonitors(incident_id), {
			status: 200
		});
	} catch (e) {
		return json(
			{ error: e.message },
			{
				status: 400
			}
		);
	}
}

export async function POST({ request, params }) {
	const payload = await request.json();
	const authError = await auth(request);
	if (authError !== null) {
		return json(
			{ error: authError.message },
			{
				status: 401
			}
		);
	}
	const incident_id = params.incident_id;

	// Perform validations
	if (!incident_id || isNaN(incident_id)) {
		return json(
			{ error: "Invalid incident_id" },
			{
				status: 400
			}
		);
	}
	if (!payload.tag || typeof payload.tag !== "string") {
		return json(
			{ error: "Invalid tag" },
			{
				status: 400
			}
		);
	}
	if (!payload.impact || typeof payload.impact !== "string") {
		return json(
			{ error: "Invalid impact" },
			{
				status: 400
			}
		);
	}

	try {
		let incidentDb = await AddIncidentMonitor(incident_id, payload.tag, payload.impact);
		return json(await GetIncidentMonitors(incident_id), {
			status: 200
		});
	} catch (e) {
		return json(
			{ error: e.message },
			{
				status: 400
			}
		);
	}
}
