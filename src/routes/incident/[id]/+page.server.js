// @ts-nocheck
import { env } from "$env/dynamic/public";
import { GetIncidents, Mapper } from "../../../../scripts/github.js";
import fs from "fs-extra";

/**
 * @param {{body: string | import("markdown-it/lib/token")[];number: any;title: any;created_at: any;updated_at: any;comments: any;html_url: any;}} issue
 * @this {any}
 */

// @ts-ignore
export async function load({ params, route, url, parent }) {
	let monitors = JSON.parse(fs.readFileSync(env.PUBLIC_KENER_FOLDER + "/monitors.json", "utf8"));
    const siteData = await parent();
    const github = siteData.site.github;
    // @ts-ignore
    const { description, name, tag, image } = monitors.find((monitor) => monitor.folderName === params.id);
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
        pastIncidents: await Promise.all(gitHubPastIssues.map(Mapper, { github })),
    };
}