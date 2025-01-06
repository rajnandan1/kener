// @ts-nocheck
// @ts-ignore
import { json } from "@sveltejs/kit";
import { auth } from "$lib/server/webhook";
import { CreateIncident, ParseIncidentToAPIResp } from "$lib/server/controllers/controller";

export async function POST({ request }) {
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
	try {
		let incidentDb = await CreateIncident(payload);
		return json(await ParseIncidentToAPIResp(incidentDb.incident_id), {
			status: 201
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
