// @ts-nocheck
import monitors from "$lib/.kener/monitors.json";
import { hasActiveIncident } from "$lib/server/incident";

export async function load({ params, route, url, parent }) {
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
