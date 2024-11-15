// @ts-nocheck
import fs from "fs-extra";
import i18n from "$lib/i18n/server";
import { siteStore } from "$lib/server/stores/site";
import { get } from "svelte/store";
export async function load({ params, route, url, cookies, request }) {
	let site = get(siteStore);
	const headers = request.headers;
	const userAgent = headers.get("user-agent");
	let localTz = "GMT";
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

	//load all files from lib locales folder
	let selectedLang = "en";
	const localLangCookie = cookies.get("localLang");
	if (!!localLangCookie && site.i18n?.locales[localLangCookie]) {
		selectedLang = localLangCookie;
	} else if (site.i18n?.defaultLocale && site.i18n?.locales[site.i18n.defaultLocale]) {
		selectedLang = site.i18n.defaultLocale;
	}
	let embed = false;
	if (route.id.endsWith("embed-[tag]")) {
		embed = true;
	}
	const query = url.searchParams;
	const bgc = query.get("bgc") ? "#" + query.get("bgc") : "";
	return {
		site: site,
		localTz: localTz,
		showNav,
		isBot,
		lang: i18n(String(selectedLang)),
		selectedLang: selectedLang,
		embed,
		bgc
	};
}
