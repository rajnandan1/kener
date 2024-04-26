import fs from "fs-extra";

/**
 * Map of language codes to their corresponding values.
 * @type {Record<string, any>}
 */
const langMap = {};

const files = fs.readdirSync("./locales");
for (const file of files) {
    const lang = file.split(".")[0];
    const data = fs.readFileSync(`./locales/${file}`, "utf8");
    langMap[lang] = JSON.parse(data);
}
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
