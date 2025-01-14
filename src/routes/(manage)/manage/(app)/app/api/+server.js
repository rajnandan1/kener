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
	GetAllAlertsPaginated,
	GetAllAPIKeys,
	CreateNewAPIKey,
	UpdateApiKeyStatus,
	VerifyToken,
	GetIncidentsDashboard,
	CreateIncident,
	AddIncidentMonitor,
	RemoveIncidentMonitor,
	GetIncidentActiveComments,
	UpdateCommentStatusByID,
	AddIncidentComment,
	UpdateCommentByID,
	UpdateIncident
} from "$lib/server/controllers/controller.js";
export async function POST({ request, cookies }) {
	const payload = await request.json();
	let action = payload.action;
	let data = payload.data || {};
	let resp = {};

	let tokenData = cookies.get("kener-user");

	if (!!!tokenData) {
		return json(
			{
				error: "Unauthorized"
			},
			{ status: 401 }
		);
	}

	let tokenUser = await VerifyToken(tokenData);
	if (!!!tokenUser) {
		//redirect to signin page if user is not authenticated
		return json(
			{
				error: "Unauthorized"
			},
			{ status: 401 }
		);
	}

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
		} else if (action == "getAPIKeys") {
			resp = await GetAllAPIKeys();
		} else if (action == "createNewApiKey") {
			resp = await CreateNewAPIKey(data);
		} else if (action == "updateApiKeyStatus") {
			resp = await UpdateApiKeyStatus(data);
		} else if (action == "getIncidents") {
			resp = await GetIncidentsDashboard(data);
		} else if (action == "createIncident") {
			resp = await CreateIncident(data);
		} else if (action == "updateIncident") {
			resp = await UpdateIncident(data.id, data);
		} else if (action == "addMonitor") {
			resp = await AddIncidentMonitor(
				data.incident_id,
				data.monitor_tag,
				data.monitor_impact
			);
		} else if (action == "removeMonitor") {
			resp = await RemoveIncidentMonitor(data.incident_id, data.monitor_tag);
		} else if (action == "getComments") {
			resp = await GetIncidentActiveComments(data.incident_id);
		} else if (action == "addComment") {
			resp = await AddIncidentComment(
				data.incident_id,
				data.comment,
				data.state,
				data.commented_at
			);
		} else if (action == "deleteComment") {
			resp = await UpdateCommentStatusByID(data.incident_id, data.comment_id, "INACTIVE");
		} else if (action == "updateComment") {
			resp = await UpdateCommentByID(
				data.incident_id,
				data.comment_id,
				data.comment,
				data.state,
				data.commented_at
			);
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
