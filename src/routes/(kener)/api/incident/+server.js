// @ts-nocheck
// @ts-ignore
import { json } from "@sveltejs/kit";
import { ParseIncidentPayload, auth, GHIssueToKenerIncident } from "$lib/server/webhook";
import { CreateIssue, SearchIssue } from "$lib/server/github";
import { siteStore } from "$lib/server/stores/site";
import { get } from "svelte/store";
import fs from "fs-extra";

export async function POST({ request }) {
	const payload = await request.json();
	const authError = auth(request);
	if (authError !== null) {
		return json(
			{ error: authError.message },
			{
				status: 401
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
	let resp = await CreateIssue(github, title, body, githubLabels);
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

export async function GET({ request, url }) {
	const authError = auth(request);
	if (authError !== null) {
		return json(
			{ error: authError.message },
			{
				status: 401
			}
		);
	}

	const query = url.searchParams;

	const state = query.get("state") || "open";
	const tags = query.get("tags") || ""; //comma separated list of tags
	const page = query.get("page") || 1;
	const per_page = query.get("per_page") || 10;
	const createdAfter = query.get("created_after_utc") || "";
	const createdBefore = query.get("created_before_utc") || "";
	const titleLike = query.get("title_like") || "";

	//if state is not open or closed, return 400
	if (state !== "open" && state !== "closed") {
		return json(
			{ error: "state must be open or closed" },
			{
				status: 400
			}
		);
	}
	let site = get(siteStore);
	let github = site.github;
	const repo = `${github.owner}/${github.repo}`;
	const is = "issue";

	const filterArray = [
		`repo:${repo}`,
		`is:${is}`,
		`state:${state}`,
		`label:incident`,
		`sort:created-desc`,
		`label:${tags
			.split(",")
			.map((tag) => tag.trim())
			.join(",")}`
	];
	//if createdAfter and createdBefore are both set, use the range filter
	if (createdBefore && createdAfter) {
		let dateFilter = "";
		let iso = new Date(createdAfter * 1000).toISOString();
		dateFilter += `created:${iso}`;
		iso = new Date(createdBefore * 1000).toISOString();
		dateFilter += `..${iso}`;
		filterArray.push(dateFilter);
	} else if (createdAfter) {
		//if only createdAfter is set, use the greater than or equal to filter
		let iso = new Date(createdAfter * 1000).toISOString();
		filterArray.push(`created:>=${iso}`);
	} else if (createdBefore) {
		//if only createdBefore is set, use the less than or equal to filter
		let iso = new Date(createdBefore * 1000).toISOString();
		filterArray.push(`created:<=${iso}`);
	}
	if (titleLike) {
		filterArray.unshift(`${titleLike} in:title`);
	}

	const resp = await SearchIssue(filterArray, page, per_page);

	const incidents = resp.items.map((issue) => GHIssueToKenerIncident(issue));

	return json(incidents, {
		status: 200
	});
}
