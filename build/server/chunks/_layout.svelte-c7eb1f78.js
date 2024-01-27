import { c as create_ssr_component, v as validate_component, e as escape, a as each, b as add_attribute } from './ssr-f056b9d4.js';
import './index3-940e7b25.js';
import './ctx-719e1af3.js';
import './index2-ef0fcb8d.js';
import 'clsx';
import 'tailwind-variants';

const Nav = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { data } = $$props;
  if ($$props.data === void 0 && $$bindings.data && data !== void 0)
    $$bindings.data(data);
  return `<div class="one"></div> <header class="relative z-50 w-full"><div class="container flex h-14 items-center "><div class="mr-4 flex blurry-bg w-full justify-between"><a${add_attribute("href", data.site.home ? data.site.home : "/", 0)} class="mr-6 flex items-center space-x-2">${data.site.logo ? `<img${add_attribute("src", data.site.logo, 0)} class="h-8"${add_attribute("alt", data.site.title, 0)} srcset="">` : ``} ${data.site.title ? `<span class="hidden font-bold md:inline-block text-[15px] lg:text-base">${escape(data.site.title)}</span>` : ``}</a> ${data.site.nav ? `<nav class="flex flex-wrap items-center space-x-6 text-sm font-medium">${each(data.site.nav, (navItem) => {
    return `<a${add_attribute("href", navItem.url, 0)}>${escape(navItem.name)} </a>`;
  })}</nav>` : ``}</div></div></header>`;
});
const Layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { data } = $$props;
  if ($$props.data === void 0 && $$bindings.data && data !== void 0)
    $$bindings.data(data);
  return `${data.showNav ? `${validate_component(Nav, "Nav").$$render($$result, { data }, {}, {})}` : ``} ${$$result.head += `<!-- HEAD_svelte-3shchj_START -->${$$result.title = `<title>${escape(data.site.title)}</title>`, ""}${each(Object.entries(data.site.metaTags), ([key, value]) => {
    return `<meta${add_attribute("name", key, 0)}${add_attribute("content", value, 0)}>`;
  })}<!-- HEAD_svelte-3shchj_END -->`, ""} ${slots.default ? slots.default({}) : ``} ${data.showNav && !!data.site.footerHTML ? `<footer class="py-6 z-10 md:px-8 md:py-0"><div class="container relative flex flex-col pl-0 items-center justify-center max-w-[890px] gap-4 md:h-24 md:flex-row"><div class="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0"><p class="text-center text-sm leading-loose text-muted-foreground md:text-left"><!-- HTML_TAG_START -->${data.site.footerHTML}<!-- HTML_TAG_END --></p></div></div></footer>` : ``}`;
});

export { Layout as default };
//# sourceMappingURL=_layout.svelte-c7eb1f78.js.map
