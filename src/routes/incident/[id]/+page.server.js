// @ts-nocheck
import { env } from "$env/dynamic/public";
import { activeIncident, mapper, pastIncident } from "$lib/server/incident";

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
    const gitHubActiveIssues = await activeIncident(tag, github);
    const gitHubPastIssues = await pastIncident(tag, github);
    return {
        issues: params.id,
        githubConfig: github,
        monitor: { description, name, image },
        activeIncidents: await Promise.all(gitHubActiveIssues.map(mapper, { github })),
        pastIncidents: await Promise.all(gitHubPastIssues.map(mapper, { github })),
    };
}