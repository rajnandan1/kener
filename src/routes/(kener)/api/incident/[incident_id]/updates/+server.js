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
import db from "$lib/server/db/db.js";

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

	if (!!!payload.commented_at) {
		//unix timestamp
		payload.commented_at = Math.floor(Date.now() / 1000);
	}

	try {
		let resp = await AddIncidentComment(
			incident_id,
			payload.comment,
			payload.state,
			payload.commented_at
		);
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

	let comment = await db.getIncidentCommentByID(comment_id);
	if (!!!comment) {
		return json(
			{ error: "Invalid comment_id" },
			{
				status: 400
			}
		);
	}

	let state = payload.state || comment.state;
	let commented_at = payload.commented_at || comment.commented_at;
	let commentString = payload.comment || comment.comment;

	try {
		await UpdateCommentByID(incident_id, comment_id, commentString, state, commented_at);

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
