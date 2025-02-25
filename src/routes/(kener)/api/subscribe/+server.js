// @ts-nocheck
// @ts-ignore
import {
	GetIncidentByID,
	GetSubscriberByToken,
	SubscribeToIncidentID
} from "$lib/server/controllers/controller";
import { json } from "@sveltejs/kit";

export async function POST({ request }) {
	const payload = await request.json();
	let action = payload.action;
	let data = payload.data || {};
	let resp = {};

	try {
		if (action == "subscribeToIncidentID") {
			resp = await SubscribeToIncidentID(data);
		} else if (action == "getIncidentByID") {
			resp = await GetIncidentByID(data);
		} else if (action == "getSubscriberByToken") {
			resp = await GetSubscriberByToken(data);
		}
	} catch (error) {
		resp = { error: error.message };
		return json(resp, { status: 500 });
	}
	return json(resp, {
		status: 200
	});
}
