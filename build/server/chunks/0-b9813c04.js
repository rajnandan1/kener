import fs from 'fs-extra';
import { p as public_env } from './shared-server-58a5f352.js';

const langMap = {};
const files = fs.readdirSync("./locales");
for (const file of files) {
  if (!file.endsWith(".json")) {
    continue;
  }
  const lang = file.split(".")[0];
  const data = fs.readFileSync(`./locales/${file}`, "utf8");
  try {
    langMap[lang] = JSON.parse(data);
  } catch (err) {
    console.log(`Error parsing ${file}: ${err}`);
  }
}
function mergeEnglish(language, english) {
  for (let key in english) {
    if (language[key] === void 0) {
      language[key] = english[key];
    }
    if (typeof language[key] === "object") {
      mergeEnglish(language[key], english[key]);
    }
  }
}
const defaultLang = "en";
const init = (lang) => {
  let english = langMap[defaultLang];
  let language = langMap[lang];
  if (language === void 0) {
    return english;
  }
  mergeEnglish(language, english);
  return language;
};
async function load({ params, route, url, cookies, request }) {
  let site = JSON.parse(fs.readFileSync(public_env.PUBLIC_KENER_FOLDER + "/site.json", "utf8"));
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
  let isBot = false;
  if (userAgent?.includes("Chrome-Lighthouse") || userAgent?.includes("bot")) {
    isBot = true;
  }
  let selectedLang = "en";
  const localLangCookie = cookies.get("localLang");
  if (!!localLangCookie && site.i18n?.locales[localLangCookie]) {
    selectedLang = localLangCookie;
  } else if (site.i18n?.defaultLocale && site.i18n?.locales[site.i18n.defaultLocale]) {
    selectedLang = site.i18n.defaultLocale;
  }
  return {
    site,
    localTz,
    showNav,
    isBot,
    lang: init(String(selectedLang)),
    selectedLang
  };
}

var _layout_server = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 0;
let component_cache;
const component = async () => component_cache ??= (await import('./_layout.svelte-54f19014.js')).default;
const server_id = "src/routes/+layout.server.js";
const imports = ["_app/immutable/nodes/0.4f379a4d.js","_app/immutable/chunks/scheduler.36bfad59.js","_app/immutable/chunks/index.76a7851a.js","_app/immutable/chunks/globals.7f7f1b26.js","_app/immutable/chunks/Icon.22c2c156.js","_app/immutable/chunks/index.a41bf830.js","_app/immutable/chunks/index.f836667e.js","_app/immutable/chunks/events.74eec825.js"];
const stylesheets = ["_app/immutable/assets/0.1ffe9223.css"];
const fonts = [];

export { component, fonts, imports, index, _layout_server as server, server_id, stylesheets };
//# sourceMappingURL=0-b9813c04.js.map
