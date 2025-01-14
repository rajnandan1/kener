//read $lib/locales/locales.json and dynamic import all the locales
/**
 * Map of language codes to their corresponding values.
 * @type {Record<string, any>}
 */
const langMap = {};
import localesStr from "$lib/locales/locales.json?raw";
const locales = JSON.parse(localesStr);
locales.forEach((/** @type {{ code: string; }} */ locale) => {
	import(`$lib/locales/${locale.code}.json`).then((data) => {
		langMap[locale.code] = data.default;
	});
});

/**
 * @param {{ [x: string]: any; }} language
 * @param {{ [x: string]: any; }} english
 */
function mergeEnglish(language, english) {
	for (let key in english) {
		if (language[key] === undefined) {
			language[key] = english[key];
		}
		if (typeof language[key] === "object") {
			mergeEnglish(language[key], english[key]);
		}
	}
}
const defaultLang = "en";

const init = (/** @type {string} */ lang) => {
	let english = langMap[defaultLang];
	let language = langMap[lang];

	if (language === undefined) {
		return english;
	}

	mergeEnglish(language, english);

	return language;
};

export default init;
