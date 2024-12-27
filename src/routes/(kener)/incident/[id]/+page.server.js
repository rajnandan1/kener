// @ts-nocheck
import { GetIncidents, Mapper } from "$lib/server/github.js";
import { GetMonitors } from "$lib/server/controllers/controller.js";

// @ts-ignore
export async function load({ params, route, url, parent }) {
	let monitors = await GetMonitors({ status: "ACTIVE" });
	const siteData = await parent();
	const github = siteData.site.github;
	// @ts-ignore
	const { description, name, tag, image } = monitors.find((monitor) => monitor.tag === params.id);
	const allIncidents = await GetIncidents(tag, "all");
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
