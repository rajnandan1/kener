// @ts-nocheck
// @ts-ignore
import { json } from "@sveltejs/kit";
import { auth } from "$lib/server/webhook";
import { AddComment, GetCommentsForIssue } from "$lib/server/github";
import { siteStore } from "$lib/server/stores/site";
import { get } from "svelte/store";
import fs from "fs-extra";

export async function GET({ request, params }) {
	const authError = auth(request);
	if (authError !== null) {
		return json(
			{ error: authError.message },
			{
				status: 401
			}
		);
	}
	const incidentNumber = params.incidentNumber; //number required
	// Perform validations
	if (!incidentNumber || isNaN(incidentNumber)) {
		return json(
			{ error: "Invalid incidentNumber" },
			{
				status: 400
			}
		);
	}

	let site = get(siteStore);
	let github = site.github;
	let resp = await GetCommentsForIssue(incidentNumber, github);
	return json(
		resp.map((comment) => {
			return {
				commentID: comment.id,
				body: comment.body,
				createdAt: Math.floor(new Date(comment.created_at).getTime() / 1000)
			};
		}),
		{
			status: 200
		}
	);
}
export async function POST({ request, params }) {
	// const headers = await request.headers();
	const authError = auth(request);
	if (authError !== null) {
		return json(
			{ error: authError.message },
			{
				status: 401
			}
		);
	}
	const incidentNumber = params.incidentNumber; //number required
	// Perform validations
	if (!incidentNumber || isNaN(incidentNumber)) {
		return json(
			{ error: "Invalid incidentNumber" },
			{
				status: 400
			}
		);
	}
	const payload = await request.json();
	let body = payload.body; //string required
	if (!body || typeof body !== "string") {
		return json(
			{ error: "Invalid body" },
			{
				status: 400
			}
		);
	}

	let site = get(siteStore);
	let github = site.github;

	let resp = await AddComment(github, incidentNumber, body);
	if (resp === null) {
		return json(
			{ error: "github error" },
			{
				status: 400
			}
		);
	}
	return json(
		{
			commentID: resp.id,
			body: resp.body,
			createdAt: Math.floor(new Date(resp.created_at).getTime() / 1000)
		},
		{
			status: 200
		}
	);
}
