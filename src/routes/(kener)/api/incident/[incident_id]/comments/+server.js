// @ts-nocheck
// @ts-ignore
import { json } from "@sveltejs/kit";
import { auth } from "$lib/server/webhook";
import {
	AddIncidentComment,
	GetIncidentComments,
	UpdateCommentByID,
	UpdateCommentStatusByID
} from "$lib/server/controllers/controller";

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
		let resp = await GetIncidentComments(incident_id);
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
export async function POST({ request, params }) {
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
	const incident_id = params.incident_id; //number required
	const payload = await request.json();

	if (!payload.comment) {
		return json(
			{ error: "Invalid comment" },
			{
				status: 400
			}
		);
	}

	try {
		let resp = await AddIncidentComment(incident_id, payload.comment);
		return json(await GetIncidentComments(incident_id), {
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

export async function PATCH({ request, params, url }) {
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
	const comment_id = query.get("comment_id");

	if (!comment_id) {
		return json(
			{ error: "Invalid comment_id" },
			{
				status: 400
			}
		);
	}

	const payload = await request.json();

	if (!!payload.status && !["ACTIVE", "INACTIVE"].includes(payload.status)) {
		return json(
			{ error: "Invalid status" },
			{
				status: 400
			}
		);
	}

	try {
		if (!!payload.comment) {
			await UpdateCommentByID(incident_id, comment_id, payload.comment);
		}

		if (!!payload.status) {
			await UpdateCommentStatusByID(incident_id, comment_id, payload.status);
		}

		return json(await GetIncidentComments(incident_id), {
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
