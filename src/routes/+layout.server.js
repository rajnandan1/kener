import fs from "fs-extra";
import { env } from "$env/dynamic/public";
export async function load({ params, route, url }) {
	let site = JSON.parse(fs.readFileSync(env.PUBLIC_KENER_FOLDER + "/site.json", "utf8"));
    return {
        site: site,
    };
}
