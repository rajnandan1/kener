import { c as create_ssr_component, v as validate_component, e as escape, a as each, b as add_attribute } from './ssr-04a1ecec.js';
import { b as buttonVariants } from './index2-f09d0673.js';
import { I as Icon$1 } from './Icon-d0fee180.js';
import './ctx-a0762cf8.js';
import './index3-a2001cb4.js';
import 'clsx';
import 'tailwind-variants';

const Github = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    [
      "path",
      {
        "d": "M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"
      }
    ],
    ["path", { "d": "M9 18c-4.51 2-5-2-7-2" }]
  ];
  return `${validate_component(Icon$1, "Icon").$$render($$result, Object.assign({}, { name: "github" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Github$1 = Github;
const Nav = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { data } = $$props;
  if ($$props.data === void 0 && $$bindings.data && data !== void 0)
    $$bindings.data(data);
  return `<div class="one"></div> <header class="relative z-50 w-full "><div class="container flex h-14 items-center"><div class="mr-4 flex blurry-bg "><a${add_attribute("href", data.site.home, 0)} class="mr-6 flex items-center space-x-2"><img${add_attribute("src", data.site.logo, 0)} class="h-5 w-5" alt="" srcset=""> <span class="hidden font-bold sm:inline-block text-[15px] lg:text-base">${escape(data.site.title)}</span></a> <nav class="flex items-center space-x-6 text-sm font-medium">${each(data.site.nav, (navItem) => {
    return `<a${add_attribute("href", navItem.url, 0)}>${escape(navItem.name)} </a>`;
  })}</nav></div> ${data.site.github && data.site.github.visible ? `<div class="flex flex-1 items-center justify-between space-x-2 sm:space-x-4 md:justify-end"><div class="w-full flex-1 md:w-auto md:flex-none"><a href="${"https://github.com/" + escape(data.site.github.owner, true) + "/" + escape(data.site.github.repo, true)}" class="${escape(buttonVariants({ variant: "ghost" }), true) + " blurry-bg"}">${validate_component(Github$1, "Github").$$render(
    $$result,
    {
      class: "h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all"
    },
    {},
    {}
  )}</a></div></div>` : ``}</div></header>`;
});
const Layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { data } = $$props;
  var dt = /* @__PURE__ */ new Date();
  let tz = dt.getTimezoneOffset();
  console.log(tz);
  if ($$props.data === void 0 && $$bindings.data && data !== void 0)
    $$bindings.data(data);
  return `${validate_component(Nav, "Nav").$$render($$result, { data }, {}, {})} ${$$result.head += `<!-- HEAD_svelte-xs6o1m_START -->${$$result.title = `<title>${escape(data.site.title)}</title>`, ""}${each(Object.entries(data.site.metaTags), ([key, value]) => {
    return `<meta${add_attribute("name", key, 0)}${add_attribute("content", value, 0)}>`;
  })}<!-- HEAD_svelte-xs6o1m_END -->`, ""} ${slots.default ? slots.default({}) : ``}`;
});

export { Layout as default };
//# sourceMappingURL=_layout.svelte-af02aa22.js.map
