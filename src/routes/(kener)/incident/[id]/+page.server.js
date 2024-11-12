// @ts-nocheck
import { monitorsStore } from "$lib/server/stores/monitors";
import { GetIncidents, Mapper } from "$lib/server/github.js";
import fs from "fs-extra";
import { get } from "svelte/store";

/**
 * @param {{body: string | import("markdown-it/lib/token")[];number: any;title: any;created_at: any;updated_at: any;comments: any;html_url: any;}} issue
 * @this {any}
 */

// @ts-ignore
export async function load({ params, route, url, parent }) {
	let monitors = get(monitorsStore);
	const siteData = await parent();
	const github = siteData.site.github;
	// @ts-ignore
	const { description, name, tag, image } = monitors.find(
		(monitor) => monitor.folderName === params.id
	);
	const allIncidents = await GetIncidents(tag, github, "all");
	const gitHubActiveIssues = allIncidents.filter((issue) => {
		return issue.state === "open";
	});
	const gitHubPastIssues = allIncidents.filter((issue) => {
		return issue.state === "closed";
	});
	return {
		issues: params.id,
		githubConfig: github,
		monitor: { description, name, image },
		activeIncidents: await Promise.all(gitHubActiveIssues.map(Mapper, { github })),
		pastIncidents: await Promise.all(gitHubPastIssues.map(Mapper, { github }))
	};
}
