// @ts-nocheck
import { env } from "$env/dynamic/public";
import fs from "fs-extra";
import { StatusColor, ParseUptime, Badge } from "$lib/helpers.js";
const monitors = JSON.parse(fs.readFileSync(env.PUBLIC_KENER_FOLDER + "/monitors.json", "utf8"));
export async function GET({ params, setHeaders }) {
    // @ts-ignore
    const { path0Day, name } = monitors.find((monitor) => monitor.tag === params.tag);
	 const dayData = JSON.parse(fs.readFileSync(path0Day, "utf8"));
	const lastObj = {
		status: "0",
	};
	
	//add all status up, degraded, down
	let ups = 0;
	let downs = 0;
	let degradeds = 0;
	for (const timestamp in dayData) {
		const obj = dayData[timestamp];
		if (obj.status == "UP") {
			ups++;
		} else if (obj.status == "DEGRADED") {
			degradeds++;
		} else if (obj.status == "DOWN") {
			downs++;
		}
	}

	let uptime = ParseUptime(ups + degradeds, ups + degradeds + downs) + "%";
	
    
	setHeaders({
        "Content-Type": "image/svg+xml",
    });
	return new Response(Badge(name, uptime, "0079FF"), {
        headers: {
            "Content-Type": "image/svg+xml",
        },
    });
}
