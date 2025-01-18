// @ts-nocheck
import i18n from "$lib/i18n/server";
import { redirect } from "@sveltejs/kit";
import { base } from "$app/paths";
import {
	GetAllSiteData,
	IsSetupComplete,
	IsLoggedInSession
} from "$lib/server/controllers/controller.js";

export async function load({ params, route, url, cookies, request }) {
	let isSetupComplete = await IsSetupComplete();
	if (!isSetupComplete) {
		throw redirect(302, base + "/manage/setup");
	}

	if (process.env.KENER_SECRET_KEY === undefined) {
		throw redirect(302, base + "/manage/setup");
	}

	let isLoggedIn = await IsLoggedInSession(cookies);

	let site = await GetAllSiteData();
	const headers = request.headers;
	const userAgent = headers.get("user-agent");
	let localTz = "UTC";
	const localTzCookie = cookies.get("localTz");
	if (!!localTzCookie) {
		localTz = localTzCookie;
	}
	let showNav = true;
	if (url.pathname.startsWith("/embed")) {
		showNav = false;
	}
	// if the user agent is lighthouse, then we are running a lighthouse test
	//if bot also set localTz to -1 to avoid reload
	let isBot = false;
	if (userAgent?.includes("Chrome-Lighthouse") || userAgent?.includes("bot")) {
		isBot = true;
	}
	const query = url.searchParams;
	//load all files from lib locales folder
	let selectedLang = query.get("locale") ? query.get("locale") : "en";

	let embed = false;
	if (route.id.endsWith("monitor-[tag]")) {
		embed = true;
	}

	const bgc = query.get("bgc") ? "#" + query.get("bgc") : "";
	return {
		site: site,
		localTz: localTz,
		showNav,
		isBot,
		lang: i18n(String(selectedLang)),
		selectedLang: selectedLang,
		embed,
		bgc,
		isLoggedIn: !!isLoggedIn.user
	};
}
