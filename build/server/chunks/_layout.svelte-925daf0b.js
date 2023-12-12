import { c as create_ssr_component, v as validate_component, e as escape, a as each, b as add_attribute } from './ssr-04a1ecec.js';
import { d as derived, w as writable } from './index3-b6b9df09.js';
import { b as buttonVariants } from './index2-5597d8a8.js';
import { I as Icon$1 } from './Icon-0028b73d.js';
import './ctx-d6e03269.js';
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
let timeoutAction;
let timeoutEnable;
function withoutTransition(action) {
  if (typeof document === "undefined")
    return;
  clearTimeout(timeoutAction);
  clearTimeout(timeoutEnable);
  const style = document.createElement("style");
  const css = document.createTextNode(`* {
     -webkit-transition: none !important;
     -moz-transition: none !important;
     -o-transition: none !important;
     -ms-transition: none !important;
     transition: none !important;
  }`);
  style.appendChild(css);
  const disable = () => document.head.appendChild(style);
  const enable = () => document.head.removeChild(style);
  if (typeof window.getComputedStyle !== "undefined") {
    disable();
    action();
    window.getComputedStyle(style).opacity;
    enable();
    return;
  }
  if (typeof window.requestAnimationFrame !== "undefined") {
    disable();
    action();
    window.requestAnimationFrame(enable);
    return;
  }
  disable();
  timeoutAction = window.setTimeout(() => {
    action();
    timeoutEnable = window.setTimeout(enable, 120);
  }, 120);
}
const noopStorage = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getItem: (_key) => null,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setItem: (_key, _value) => {
  }
};
const isBrowser = typeof document !== "undefined";
const localStorageKey = "mode";
const userPrefersMode = createUserPrefersMode();
const systemPrefersMode = createSystemMode();
createDerivedMode();
function createUserPrefersMode() {
  const defaultValue = "system";
  const storage = isBrowser ? localStorage : noopStorage;
  let value = storage.getItem(localStorageKey) || defaultValue;
  const { subscribe, set: _set } = writable(value, () => {
    if (isBrowser) {
      const handler = (e) => {
        if (e.key === localStorageKey) {
          _set(value = e.newValue || defaultValue);
        }
      };
      addEventListener("storage", handler);
      return () => removeEventListener("storage", handler);
    }
  });
  function set(v) {
    _set(value = v);
    storage.setItem(localStorageKey, value);
  }
  return {
    subscribe,
    set
  };
}
function createSystemMode() {
  const defaultValue = void 0;
  let track = true;
  const { subscribe, set } = writable(defaultValue, () => {
    if (isBrowser) {
      const handler = (e) => {
        if (track) {
          set(e.matches ? "light" : "dark");
        }
      };
      const mediaQueryState = window.matchMedia("(prefers-color-scheme: light)");
      mediaQueryState.addEventListener("change", handler);
      return () => mediaQueryState.removeEventListener("change", handler);
    }
  });
  function query() {
    if (isBrowser) {
      const mediaQueryState = window.matchMedia("(prefers-color-scheme: light)");
      set(mediaQueryState.matches ? "light" : "dark");
    }
  }
  function tracking(active) {
    track = active;
  }
  return {
    subscribe,
    query,
    tracking
  };
}
function createDerivedMode() {
  const { subscribe } = derived([userPrefersMode, systemPrefersMode], ([$userPrefersMode, $systemPrefersMode]) => {
    if (!isBrowser)
      return void 0;
    const derivedMode = $userPrefersMode === "system" ? $systemPrefersMode : $userPrefersMode;
    withoutTransition(() => {
      const htmlEl = document.documentElement;
      if (derivedMode === "light") {
        htmlEl.classList.remove("dark");
        htmlEl.style.colorScheme = "light";
      } else {
        htmlEl.classList.add("dark");
        htmlEl.style.colorScheme = "dark";
      }
    });
    return derivedMode;
  });
  return {
    subscribe
  };
}
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
  if ($$props.data === void 0 && $$bindings.data && data !== void 0)
    $$bindings.data(data);
  return `${validate_component(Nav, "Nav").$$render($$result, { data }, {}, {})} ${$$result.head += `<!-- HEAD_svelte-xs6o1m_START -->${$$result.title = `<title>${escape(data.site.title)}</title>`, ""}${each(Object.entries(data.site.metaTags), ([key, value]) => {
    return `<meta${add_attribute("name", key, 0)}${add_attribute("content", value, 0)}>`;
  })}<!-- HEAD_svelte-xs6o1m_END -->`, ""} ${slots.default ? slots.default({}) : ``}`;
});

export { Layout as default };
//# sourceMappingURL=_layout.svelte-925daf0b.js.map
