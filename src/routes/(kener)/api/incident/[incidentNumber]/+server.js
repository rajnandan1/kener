// @ts-nocheck
// @ts-ignore
import { json } from "@sveltejs/kit";
import { auth, ParseIncidentPayload, GHIssueToKenerIncident } from "$lib/server/webhook";
import {
	GetIncidentByNumber,
	GetStartTimeFromBody,
	GetEndTimeFromBody,
	UpdateIssue
} from "$lib/server/github";
import { siteStore } from "$lib/server/stores/site";
import { get } from "svelte/store";
import fs from "fs-extra";

export async function PATCH({ request, params }) {
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
	const payload = await request.json();
	if (!incidentNumber || isNaN(incidentNumber)) {
		return json(
			{ error: "Invalid incidentNumber" },
			{
				status: 400
			}
		);
	}
	let { title, body, githubLabels, error } = ParseIncidentPayload(payload);
	if (error) {
		return json(
			{ error },
			{
				status: 400
			}
		);
	}

	let site = get(siteStore);
	let github = site.github;
	let resp = await UpdateIssue(github, incidentNumber, title, body, githubLabels);
	if (resp === null) {
		return json(
			{ error: "github error" },
			{
				status: 400
			}
		);
	}
	return json(GHIssueToKenerIncident(resp), {
		status: 200
	});
}

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
	// const headers = await request.headers();

	let site = get(siteStore);
	let github = site.github;
	let issue = await GetIncidentByNumber(github, incidentNumber);
	if (issue === null) {
		return json(
			{ error: "incident not found" },
			{
				status: 404
			}
		);
	}

	return json(GHIssueToKenerIncident(issue), {
		status: 200
	});
}
