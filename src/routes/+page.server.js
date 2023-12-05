// @ts-nocheck
import { hasActiveIncident } from "$lib/server/incident";
import { env } from "$env/dynamic/public";
import fs from "fs-extra";

export async function load({ params, route, url, parent }) {
	let monitors = JSON.parse(fs.readFileSync(env.PUBLIC_KENER_FOLDER + '/monitors.json', "utf8"));
    const parentData = await parent();
    const siteData = parentData.site;
    const github = siteData.github;
    for (let i = 0; i < monitors.length; i++) {
        monitors[i].hasActiveIncident = await hasActiveIncident(monitors[i].tag, github);
    }

    return {
        monitors: monitors,
    };
}
