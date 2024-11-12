import en from "$lib/locales/en.json";
import hi from "$lib/locales/hi.json";
import ja from "$lib/locales/ja.json";
import vi from "$lib/locales/vi.json";
import zhCN from "$lib/locales/zh-CN.json";

/**
 * Map of language codes to their corresponding values.
 * @type {Record<string, any>}
 */
const langMap = {
	en,
	hi,
	ja,
	vi,
	"zh-CN": zhCN
};

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
