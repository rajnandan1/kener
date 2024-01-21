import fs from "fs-extra";
import { env } from "$env/dynamic/public";

export async function load({ params, route, url, cookies }) {
    let site = JSON.parse(fs.readFileSync(env.PUBLIC_KENER_FOLDER + "/site.json", "utf8"));
    let localTz = "GMT";
    const localTzCookie = cookies.get("localTz");
	if (!!localTzCookie) {
        localTz = localTzCookie;
    }
	let showNav = true
	if(url.pathname.startsWith('/embed')) {
		showNav = false
	}
    return {
        site: site,
        localTz: localTz,
        showNav,
    };
}
