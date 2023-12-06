import { c as create_ssr_component, b as add_attribute, e as escape, a as each, v as validate_component, h as compute_rest_props, i as spread, j as escape_attribute_value, k as escape_object } from './ssr-b88b7280.js';
import { C as Card, a as Card_header, b as Card_title, c as Card_description, S as Separator, d as Card_content, e as cn } from './separator-e432f81a.js';
import 'clsx';
import { I as Icon$1, v as validate_dynamic_element, a as validate_void_dynamic_element, i as is_void } from './ctx-0c900a31.js';
import { b as buttonVariants } from './index2-b1ce715f.js';
import { tv } from 'tailwind-variants';
import 'tailwind-merge';
import './index3-b13f1ade.js';

const Arrow_right = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [["path", { "d": "M5 12h14" }], ["path", { "d": "m12 5 7 7-7 7" }]];
  return `${validate_component(Icon$1, "Icon").$$render($$result, Object.assign({}, { name: "arrow-right" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const ArrowRight = Arrow_right;
function getAttrs(builders) {
  const attrs = {};
  builders.forEach((builder) => {
    Object.keys(builder).forEach((key) => {
      if (key !== "action") {
        attrs[key] = builder[key];
      }
    });
  });
  return attrs;
}
const Button$1 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["href", "type", "builders"]);
  let { href = void 0 } = $$props;
  let { type = void 0 } = $$props;
  let { builders = [] } = $$props;
  const attrs = { "data-bits-button-root": "" };
  if ($$props.href === void 0 && $$bindings.href && href !== void 0)
    $$bindings.href(href);
  if ($$props.type === void 0 && $$bindings.type && type !== void 0)
    $$bindings.type(type);
  if ($$props.builders === void 0 && $$bindings.builders && builders !== void 0)
    $$bindings.builders(builders);
  return `${builders && builders.length ? ` ${((tag) => {
    validate_dynamic_element(tag);
    return tag ? (() => {
      validate_void_dynamic_element(tag);
      return `<${href ? "a" : "button"}${spread(
        [
          {
            type: escape_attribute_value(href ? void 0 : type)
          },
          { href: escape_attribute_value(href) },
          { tabindex: "0" },
          escape_object(getAttrs(builders)),
          escape_object($$restProps),
          escape_object(attrs)
        ],
        {}
      )}>${is_void(tag) ? "" : `${slots.default ? slots.default({}) : ``}`}${is_void(tag) ? "" : `</${tag}>`}`;
    })() : "";
  })(href ? "a" : "button")}` : ` ${((tag) => {
    validate_dynamic_element(tag);
    return tag ? (() => {
      validate_void_dynamic_element(tag);
      return `<${href ? "a" : "button"}${spread(
        [
          {
            type: escape_attribute_value(href ? void 0 : type)
          },
          { href: escape_attribute_value(href) },
          { tabindex: "0" },
          escape_object($$restProps),
          escape_object(attrs)
        ],
        {}
      )}>${is_void(tag) ? "" : `${slots.default ? slots.default({}) : ``}`}${is_void(tag) ? "" : `</${tag}>`}`;
    })() : "";
  })(href ? "a" : "button")}`}`;
});
const Button = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["class", "variant", "size", "builders"]);
  let { class: className = void 0 } = $$props;
  let { variant = "default" } = $$props;
  let { size = "default" } = $$props;
  let { builders = [] } = $$props;
  if ($$props.class === void 0 && $$bindings.class && className !== void 0)
    $$bindings.class(className);
  if ($$props.variant === void 0 && $$bindings.variant && variant !== void 0)
    $$bindings.variant(variant);
  if ($$props.size === void 0 && $$bindings.size && size !== void 0)
    $$bindings.size(size);
  if ($$props.builders === void 0 && $$bindings.builders && builders !== void 0)
    $$bindings.builders(builders);
  return `${validate_component(Button$1, "ButtonPrimitive.Root").$$render(
    $$result,
    Object.assign(
      {},
      { builders },
      {
        class: cn(buttonVariants({ variant, size, className }))
      },
      { type: "button" },
      $$restProps
    ),
    {},
    {
      default: () => {
        return `${slots.default ? slots.default({}) : ``}`;
      }
    }
  )}`;
});
const Skeleton = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["class"]);
  let { class: className = void 0 } = $$props;
  if ($$props.class === void 0 && $$bindings.class && className !== void 0)
    $$bindings.class(className);
  return `<div${spread(
    [
      {
        class: escape_attribute_value(cn("animate-pulse rounded-md bg-muted", className))
      },
      escape_object($$restProps)
    ],
    {}
  )}></div>`;
});
tv({
  base: "relative w-full rounded-lg border p-4 [&>svg]:absolute [&>svg]:text-foreground [&>svg]:left-4 [&>svg]:top-4 [&>svg+div]:translate-y-[-3px] [&:has(svg)]:pl-11",
  variants: {
    variant: {
      default: "bg-background text-foreground",
      destructive: "text-destructive border-destructive/50 dark:border-destructive [&>svg]:text-destructive text-destructive"
    }
  },
  defaultVariants: {
    variant: "default"
  }
});
function getTodayDD() {
  let yourDate = /* @__PURE__ */ new Date();
  const offset = yourDate.getTimezoneOffset();
  yourDate = new Date(yourDate.getTime() - offset * 60 * 1e3);
  return yourDate.toISOString().split("T")[0];
}
function getminuteFromMidnightTillNow() {
  var date = /* @__PURE__ */ new Date();
  date.getHours();
  date.getMinutes();
}
const Monitor = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { monitor } = $$props;
  let todayDD = getTodayDD();
  let _90Day = {};
  let statusObj = {
    UP: "api-up",
    DEGRADED: "api-degraded",
    DOWN: "api-down",
    NO_DATA: "api-nodata"
  };
  getminuteFromMidnightTillNow();
  if ($$props.monitor === void 0 && $$bindings.monitor && monitor !== void 0)
    $$bindings.monitor(monitor);
  return `<section class="mx-auto backdrop-blur-[2px] mb-8 flex w-full max-w-[770px] flex-1 flex-col items-start justify-center">${validate_component(Card, "Card.Root").$$render($$result, { class: "w-full" }, {}, {
    default: () => {
      return `${validate_component(Card_header, "Card.Header").$$render($$result, {}, {}, {
        default: () => {
          return `<div class="grid grid-cols-3 gap-4"><div class="${"col-span-3 md:col-span-2 relative " + escape(!!monitor.image ? "pl-11" : "", true)}">${monitor.image ? `<img${add_attribute("src", monitor.image, 0)} class="w-8 h-8 left-0 top-[1px] absolute" alt="" srcset="">` : ``} ${validate_component(Card_title, "Card.Title").$$render($$result, {}, {}, {
            default: () => {
              return `${escape(monitor.name)}`;
            }
          })} ${monitor.description ? `${validate_component(Card_description, "Card.Description").$$render($$result, { class: "mt-1" }, {}, {
            default: () => {
              return `${escape(monitor.description)}`;
            }
          })}` : ``}</div> <div class="col-span-3 md:col-span-1 md:text-right">${monitor.hasActiveIncident ? `<a href="${"incident/" + escape(monitor.folderName, true)}"><a href="${"/incident/" + escape(monitor.folderName, true) + "#active_incident"}" class="${escape(buttonVariants({ variant: "outline" }), true) + " relative"}"><span class="animate-ping absolute -right-[2px] -top-[2px] w-[8px] h-[8px] inline-flex rounded-full h-3 w-3 bg-red-500 opacity-75"></span>
                            Ongoing Incident</a></a>` : `${_90Day[todayDD] && _90Day[todayDD].cssClass == statusObj.DOWN ? `<p class="text-destructive mt-3 text-sm font-semibold">Down for ${escape(_90Day[todayDD].DOWN)} minutes</p>` : ``}`}</div></div>`;
        }
      })} ${validate_component(Separator, "Separator").$$render($$result, { class: "mb-4 mt-1" }, {}, {})} ${validate_component(Card_content, "Card.Content").$$render($$result, {}, {}, {
        default: () => {
          return `<div class="grid grid-cols-3 gap-4 mb-4"><div class="col-span-3 sm:col-span-2 text-left">${validate_component(Button, "Button").$$render(
            $$result,
            {
              class: "h-9 px-4 py-2 w-48 rounded-full sm:w-auto",
              variant: ""
            },
            {},
            {
              default: () => {
                return `90 Day`;
              }
            }
          )} ${validate_component(Button, "Button").$$render(
            $$result,
            {
              class: "h-9 px-4 py-2 w-48 rounded-full sm:w-auto",
              variant: "ghost"
            },
            {},
            {
              default: () => {
                return `Today`;
              }
            }
          )}</div> <div class="col-span-3 sm:col-span-1 sm:text-right"><a href="${"/incident/" + escape(monitor.folderName, true) + "#past_incident"}"${add_attribute("class", buttonVariants({ variant: "ghost" }), 0)}>Past Incidents ${validate_component(ArrowRight, "ArrowRight").$$render($$result, { size: 16 }, {}, {})}</a></div></div> ${`<div>${`${validate_component(Skeleton, "Skeleton").$$render($$result, { class: "w-[720px] h-[40px] mt-4" }, {}, {})}`}</div>`}`;
        }
      })}`;
    }
  })}</section>`;
});
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { data } = $$props;
  if ($$props.data === void 0 && $$bindings.data && data !== void 0)
    $$bindings.data(data);
  return `${data.site.hero ? `<section class="mx-auto flex w-full max-w-4xl flex-1 flex-col items-start justify-center"><div class="mx-auto max-w-screen-xl px-4 pt-32 pb-16 lg:flex lg:items-center"><div class="mx-auto max-w-3xl text-center blurry-bg">${data.site.hero.image ? `<img${add_attribute("src", data.site.hero.image, 0)} class="h-16 w-16 m-auto" alt="" srcset="">` : ``} ${data.site.hero.title ? `<h1 class="bg-gradient-to-r from-green-300 via-blue-500 to-purple-600 bg-clip-text text-5xl font-extrabold text-transparent leading-snug">${escape(data.site.hero.title)}</h1>` : ``} ${data.site.hero.subtitle ? `<p class="mx-auto mt-4 max-w-xl sm:text-xl">${escape(data.site.hero.subtitle)}</p>` : ``}</div></div></section>` : ``} ${each(data.monitors, (monitor) => {
    return `${validate_component(Monitor, "Monitor").$$render($$result, { monitor }, {}, {})}`;
  })}`;
});

export { Page as default };
//# sourceMappingURL=_page.svelte-dd84e9dd.js.map
