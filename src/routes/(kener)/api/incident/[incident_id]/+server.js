// @ts-nocheck
// @ts-ignore
import { json } from "@sveltejs/kit";
import { auth } from "$lib/server/webhook";

import {
	CreateIncident,
	ParseIncidentToAPIResp,
	UpdateIncident
} from "$lib/server/controllers/controller";

export async function PATCH({ request, params }) {
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
	const payload = await request.json();

	try {
		let resp = await UpdateIncident(incident_id, payload);
		return json(await ParseIncidentToAPIResp(incident_id), {
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
		return json(await ParseIncidentToAPIResp(incident_id), {
			status: 200
		});
	} catch (e) {
		return json(
			{ error: e.message },
			{
				status: 404
			}
		);
	}
}
