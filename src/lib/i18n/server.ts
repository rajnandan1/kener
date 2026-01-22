//read $lib/locales/locales.json and dynamic import all the locales

type LangMap = Record<string, Record<string, string>>;

const langMap: LangMap = {};
import localesStr from "$lib/locales/locales.json?raw";

interface LocaleConfig {
  code: string;
  name?: string;
}

const locales: LocaleConfig[] = JSON.parse(localesStr);
locales.forEach((locale: LocaleConfig) => {
  import(`$lib/locales/${locale.code}.json`).then((data) => {
    langMap[locale.code] = data.default;
  });
});

function mergeEnglish(language: Record<string, unknown>, english: Record<string, unknown>): void {
  for (let key in english) {
    if (language[key] === undefined) {
      language[key] = english[key];
    }
    if (typeof language[key] === "object" && language[key] !== null) {
      mergeEnglish(language[key] as Record<string, unknown>, english[key] as Record<string, unknown>);
    }
  }
}
const defaultLang = "en";

const init = (lang: string): Record<string, string> => {
  let english = langMap[defaultLang] as Record<string, string>;
  let language = langMap[lang] as Record<string, string>;

  if (language === undefined) {
    return english;
  }

  mergeEnglish(language, english);

  return language;
};

export default init;
