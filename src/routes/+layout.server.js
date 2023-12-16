import fs from "fs-extra";
import { env } from "$env/dynamic/public";
var dt = new Date();
let tz = dt.getTimezoneOffset(); // -480
console.log(tz);
export async function load({ params, route, url }) {
	let site = JSON.parse(fs.readFileSync(env.PUBLIC_KENER_FOLDER + "/site.json", "utf8"));
    return {
        site: site,
    };
}
