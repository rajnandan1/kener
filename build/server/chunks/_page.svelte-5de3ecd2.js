import { c as create_ssr_component, e as escape, v as validate_component, a as each, f as compute_rest_props, d as subscribe, g as spread, h as escape_object } from './ssr-f056b9d4.js';
import 'clsx';
import { I as Incident } from './incident-2dcbb3c6.js';
import { e as setCtx, f as getAttrs } from './ctx-719e1af3.js';
import { c as cn } from './Icon-2d61886b.js';
import 'moment';
import { B as Badge } from './index4-9cd90a9b.js';
import './helpers-0acb6e43.js';
import './index3-940e7b25.js';
import 'tailwind-variants';
import './chevron-down-afdb97a6.js';
import './index2-ef0fcb8d.js';
import 'tailwind-merge';

const Separator$1 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let builder;
  let $$restProps = compute_rest_props($$props, ["orientation", "decorative", "asChild"]);
  let $root, $$unsubscribe_root;
  let { orientation = "horizontal" } = $$props;
  let { decorative = true } = $$props;
  let { asChild = false } = $$props;
  const { elements: { root }, updateOption } = setCtx({ orientation, decorative });
  $$unsubscribe_root = subscribe(root, (value) => $root = value);
  const attrs = getAttrs("root");
  if ($$props.orientation === void 0 && $$bindings.orientation && orientation !== void 0)
    $$bindings.orientation(orientation);
  if ($$props.decorative === void 0 && $$bindings.decorative && decorative !== void 0)
    $$bindings.decorative(decorative);
  if ($$props.asChild === void 0 && $$bindings.asChild && asChild !== void 0)
    $$bindings.asChild(asChild);
  {
    updateOption("orientation", orientation);
  }
  {
    updateOption("decorative", decorative);
  }
  builder = $root;
  $$unsubscribe_root();
  return `${asChild ? `${slots.default ? slots.default({ builder, attrs }) : ``}` : `<div${spread([escape_object(builder), escape_object($$restProps), escape_object(attrs)], {})}></div>`}`;
});
const Separator = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["class", "orientation", "decorative"]);
  let { class: className = void 0 } = $$props;
  let { orientation = "horizontal" } = $$props;
  let { decorative = void 0 } = $$props;
  if ($$props.class === void 0 && $$bindings.class && className !== void 0)
    $$bindings.class(className);
  if ($$props.orientation === void 0 && $$bindings.orientation && orientation !== void 0)
    $$bindings.orientation(orientation);
  if ($$props.decorative === void 0 && $$bindings.decorative && decorative !== void 0)
    $$bindings.decorative(decorative);
  return `${validate_component(Separator$1, "SeparatorPrimitive.Root").$$render(
    $$result,
    Object.assign(
      {},
      {
        class: cn(
          "shrink-0 bg-border",
          orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
          className
        )
      },
      { orientation },
      { decorative },
      $$restProps
    ),
    {},
    {}
  )}`;
});
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { data } = $$props;
  if ($$props.data === void 0 && $$bindings.data && data !== void 0)
    $$bindings.data(data);
  return `${$$result.head += `<!-- HEAD_svelte-1j8jcnk_START -->${$$result.title = `<title> ${escape(data.monitor.name)} - Incidents
	</title>`, ""}<!-- HEAD_svelte-1j8jcnk_END -->`, ""} <section class="mx-auto flex w-full max-w-4xl flex-1 flex-col items-start justify-center"><div class="mx-auto max-w-screen-xl px-4 pt-32 pb-16 lg:flex lg:items-center"><div class="mx-auto max-w-3xl text-center blurry-bg"><h1 class="bg-gradient-to-r from-green-300 via-blue-500 to-purple-600 bg-clip-text text-5xl font-extrabold text-transparent leading-snug">${escape(data.monitor.name)}</h1> <p class="mx-auto mt-4 max-w-xl sm:text-xl"><!-- HTML_TAG_START -->${data.monitor.description}<!-- HTML_TAG_END --></p></div></div></section> <section class="mx-auto flex-1 mt-8 flex-col mb-4 flex w-full"><div class="container"><h1 class="mb-4 text-2xl font-bold leading-none">${validate_component(Badge, "Badge").$$render($$result, { variant: "outline" }, {}, {
    default: () => {
      return `Active Incidents`;
    }
  })}</h1> ${data.activeIncidents.length > 0 ? `${each(data.activeIncidents, (incident, i) => {
    return `${validate_component(Incident, "Incident").$$render(
      $$result,
      {
        incident,
        state: i == 0 ? "open" : "close",
        variant: "title+body+comments",
        monitor: data.monitor
      },
      {},
      {}
    )}`;
  })}` : `<div class="flex items-center justify-left" data-svelte-h="svelte-otycm6"><p class="text-base font-semibold">No active incidents</p></div>`}</div></section> ${validate_component(Separator, "Separator").$$render($$result, { class: "container mb-4 w-[400px]" }, {}, {})} <section class="mx-auto flex-1 mt-8 flex-col mb-4 flex w-full"><div class="container"><h1 class="mb-4 text-2xl font-bold leading-none">${validate_component(Badge, "Badge").$$render($$result, { variant: "outline" }, {}, {
    default: () => {
      return `Recent Incidents  - Last ${escape(data.site.github.incidentSince)} Hours`;
    }
  })}</h1> ${data.pastIncidents.length > 0 ? `${each(data.pastIncidents, (incident) => {
    return `${validate_component(Incident, "Incident").$$render(
      $$result,
      {
        incident,
        state: "close",
        variant: "title+body+comments",
        monitor: data.monitor
      },
      {},
      {}
    )}`;
  })}` : `<div class="flex items-center justify-left" data-svelte-h="svelte-1wctao9"><p class="text-base font-semibold">No recent incidents</p></div>`}</div></section>`;
});

export { Page as default };
//# sourceMappingURL=_page.svelte-5de3ecd2.js.map
