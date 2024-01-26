// @ts-nocheck
import { GetIncidents, Mapper } from "../../../scripts/github.js";
import { FetchData } from "$lib/server/page";
import { env } from "$env/dynamic/public";
import fs from "fs-extra";

export async function load({ params, route, url, parent }) {
    let monitors = JSON.parse(fs.readFileSync(env.PUBLIC_KENER_FOLDER + "/monitors.json", "utf8"));
    const parentData = await parent();
    
    const monitorsActive = [];
    const query = url.searchParams;
	const theme = query.get("theme");
	for (let i = 0; i < monitors.length; i++) {
        //only return monitors that have category as home or category is not present
        if (monitors[i].tag !== params.tag) {
            continue;
        }
        delete monitors[i].api;
        delete monitors[i].defaultStatus;
		monitors[i].embed = true;
        let data = await FetchData(monitors[i], parentData.localTz);
        monitors[i].pageData = data;
        monitorsActive.push(monitors[i]);
    }

    return {
        monitors: monitorsActive,
        theme,
        openIncidents: [],
    };
}
