import fs from "fs-extra";
import { env } from "$env/dynamic/public";

export async function load({ params, route, url, cookies, request }) {
    let site = JSON.parse(fs.readFileSync(env.PUBLIC_KENER_FOLDER + "/site.json", "utf8"));
	const headers = request.headers;
	const userAgent = headers.get("user-agent");
    let localTz = "GMT";
    const localTzCookie = cookies.get("localTz");
	if (!!localTzCookie) {
        localTz = localTzCookie;
    }
	let showNav = true
	if(url.pathname.startsWith('/embed')) {
		showNav = false
	}
	// if the user agent is lighthouse, then we are running a lighthouse test
	//if bot also set localTz to -1 to avoid reload
	let isBot = false
	if (userAgent?.includes("Chrome-Lighthouse") || userAgent?.includes("bot")) {
		isBot = true;
    }
    return {
        site: site,
        localTz: localTz,
        showNav,
        isBot,
    };
}
