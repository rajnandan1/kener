// @ts-nocheck
//export is valid url

export function IsValidURL(url) {
	const regex =
		/^(https?:\/\/)?((localhost|[\da-z.-]+\.[a-z]{2,10})(:[0-9]{1,5})?)?(\/[\w .-]*)*\/?$/i;
	return regex.test(url);
}

export function IsValidGHObject(data) {
	try {
		data = JSON.parse(data);
	} catch (error) {
		return false;
	}

	if (typeof data !== "object") return false;

	if (!!data.apiURL && (typeof data.apiURL !== "string" || !IsValidURL(data.apiURL)))
		return false;

	if (!!data.owner && typeof data.owner !== "string") return false;
	if (!!data.repo && typeof data.repo !== "string") return false;
	if (!!data.incidentSince && isNaN(data.incidentSince)) return false;
	return true;
}

export function IsValidObject(data) {
	return typeof data === "object";
}
export function IsValidJSONString(data) {
	try {
		JSON.parse(data);
	} catch (error) {
		return false;
	}
	return true;
}

//IsValidJSONArray
export function IsValidJSONArray(data) {
	try {
		data = JSON.parse(data);
	} catch (error) {
		return false;
	}
	return Array.isArray(data);
}

export function IsValidNav(nav) {
	try {
		nav = JSON.parse(nav);
	} catch (error) {
		return false;
	}
	if (!Array.isArray(nav)) return false;
	if (nav.length === 0) return true;
	for (const item of nav) {
		if (!!!item.name || !!!item.url) return false;
	}
	return true;
}

export function IsValidHero(hero) {
	try {
		hero = JSON.parse(hero);
	} catch (error) {
		return false;
	}

	if (typeof hero !== "object") return false;
	if (!!hero.title && typeof hero.title !== "string") return false;
	if (!!hero.title && typeof hero.subtitle !== "string") return false;
	return true;
}

export function IsValidFooterHTML(html) {
	return typeof html === "string";
}

export function IsValidI18n(i18n) {
	try {
		i18n = JSON.parse(i18n);
	} catch (error) {
		return false;
	}

	return true;
}

export function IsValidAnalytics(analytics) {
	try {
		analytics = JSON.parse(analytics);
	} catch (error) {
		return false;
	}
	if (!Array.isArray(analytics)) return false;
	for (const item of analytics) {
		if (typeof item.id !== "string") return false;
		if (typeof item.type !== "string") return false;
	}
	return true;
}

export function IsValidColors(colors) {
	try {
		colors = JSON.parse(colors);
	} catch (error) {
		return false;
	}
	if (typeof colors !== "object") return false;
	const validColorKeys = ["UP", "DOWN", "DEGRADED"];
	for (const key of validColorKeys) {
		if (typeof colors[key] !== "string" || !/^#[0-9A-Fa-f]{6}$/.test(colors[key])) return false;
	}
	return true;
}
