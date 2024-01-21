// @ts-nocheck
import { GetIncidents, Mapper } from "../../scripts/github.js";
import { FetchData } from "$lib/server/page";
import { env } from "$env/dynamic/public";
import fs from "fs-extra";

export async function load({ params, route, url, parent }) {
	let monitors = JSON.parse(fs.readFileSync(env.PUBLIC_KENER_FOLDER + '/monitors.json', "utf8"));
    const parentData = await parent();
    const siteData = parentData.site;
    const github = siteData.github;
    const monitorsActive = [];
	for (let i = 0; i < monitors.length; i++) {
		if (monitors[i].hidden !== undefined && monitors[i].hidden === true) {
			continue;
        }
		//only return monitors that have category as home or category is not present
		if (monitors[i].category !== undefined && monitors[i].category !== "home") {
			continue;
		}
       	const gitHubActiveIssues = await GetIncidents(monitors[i].tag, github, "open");
		delete monitors[i].api;
		delete monitors[i].defaultStatus;
		let data = await FetchData(monitors[i], parentData.localTz);
		monitors[i].pageData = data;
		monitors[i].activeIncidents = await Promise.all(gitHubActiveIssues.map(Mapper, { github }));
		monitorsActive.push(monitors[i]);
	}

    return {
        monitors: monitorsActive,
    };
}
