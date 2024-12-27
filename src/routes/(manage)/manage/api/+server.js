// @ts-nocheck
// @ts-ignore
import { json } from "@sveltejs/kit";
import {
	CreateUpdateMonitor,
	InsertKeyValue,
	GetMonitors,
	CreateUpdateTrigger,
	GetAllTriggers,
	UpdateTriggerData,
	GetAllAlertsPaginated
} from "$lib/server/controllers/controller.js";
export async function POST({ request }) {
	const payload = await request.json();
	let action = payload.action;
	let data = payload.data;
	let resp = {};
	try {
		if (action === "storeSiteData") {
			resp = await storeSiteData(data);
		} else if (action == "storeMonitorData") {
			resp = await CreateUpdateMonitor(data);
		} else if (action == "getMonitors") {
			resp = await GetMonitors(data);
		} else if (action == "createUpdateTrigger") {
			resp = await CreateUpdateTrigger(data);
		} else if (action == "getTriggers") {
			resp = await GetAllTriggers(data);
		} else if (action == "updateMonitorTriggers") {
			resp = await UpdateTriggerData(data);
		} else if (action == "getAllAlertsPaginated") {
			resp = await GetAllAlertsPaginated(data);
		}
	} catch (error) {
		resp = { error: error.message };
		return json(resp, { status: 500 });
	}
	return json(resp, { status: 200 });
}
async function storeSiteData(data) {
	for (const key in data) {
		if (Object.prototype.hasOwnProperty.call(data, key)) {
			const element = data[key];
			await InsertKeyValue(key, element);
		}
	}
	return { success: true };
}
