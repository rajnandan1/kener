// @ts-nocheck
import { Mapper, GetOpenIncidents, FilterAndInsertMonitorInIncident } from "../../../scripts/github.js";
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
		if (monitors[i].category === undefined || monitors[i].category !== params.category) {
			continue;
		}
       	delete monitors[i].api;
        delete monitors[i].defaultStatus;
        let data = await FetchData(monitors[i], parentData.localTz);
        monitors[i].pageData = data;
        monitorsActive.push(monitors[i]);
	}
	let openIncidents = await GetOpenIncidents(github);
    let openIncidentsReduced = openIncidents.map(Mapper);
    return {
        monitors: monitorsActive,
        openIncidents: FilterAndInsertMonitorInIncident(openIncidentsReduced, monitorsActive),
    };
}
