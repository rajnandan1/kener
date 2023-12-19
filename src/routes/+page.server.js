// @ts-nocheck
import { mapper, activeIncident } from "$lib/server/incident";
import { FetchData } from "$lib/server/page";
import { env } from "$env/dynamic/public";
import fs from "fs-extra";

export async function load({ params, route, url, parent }) {
	let monitors = JSON.parse(fs.readFileSync(env.PUBLIC_KENER_FOLDER + '/monitors.json', "utf8"));
    const parentData = await parent();
    const siteData = parentData.site;
    const github = siteData.github;
    for (let i = 0; i < monitors.length; i++) {
       	const gitHubActiveIssues =  await activeIncident(monitors[i].tag, github);
		let data = await FetchData(monitors[i], parentData.startTodayAtTs, parentData.start90DayAtTs, parentData.tzOffset);
		monitors[i].pageData = data;
		monitors[i].activeIncidents = await Promise.all(gitHubActiveIssues.map(mapper, { github }));
	}

    return {
        monitors: monitors,
    };
}
