import { c as create_ssr_component, e as escape, v as validate_component, a as each, h as compute_rest_props, d as validate_store, f as subscribe, i as spread, j as escape_object } from './ssr-3ed108ea.js';
import 'clsx';
import { B as Badge, I as Incident } from './incident-3b230fb3.js';
import { s as setCtx, g as getAttrs } from './index3-cffb6b6f.js';
import { c as cn } from './card-content-bc70344f.js';
import 'moment';
import './index2-d2b6b2d2.js';
import './helpers-fc56b344.js';
import 'tailwind-variants';
import 'tailwind-merge';

const Separator$1 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let builder;
  let $$restProps = compute_rest_props($$props, ["orientation", "decorative", "asChild"]);
  let $root, $$unsubscribe_root;
  let { orientation = "horizontal" } = $$props;
  let { decorative = true } = $$props;
  let { asChild = false } = $$props;
  const { elements: { root }, updateOption } = setCtx({ orientation, decorative });
  validate_store(root, "root");
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
  return `<section class="mx-auto flex w-full max-w-4xl flex-1 flex-col items-start justify-center"><div class="mx-auto max-w-screen-xl px-4 pt-32 pb-16 lg:flex lg:items-center"><div class="mx-auto max-w-3xl text-center blurry-bg"><h1 class="bg-gradient-to-r from-green-300 via-blue-500 to-purple-600 bg-clip-text text-5xl font-extrabold text-transparent leading-snug">${escape(data.monitor.name)}</h1> <p class="mx-auto mt-4 max-w-xl sm:text-xl">${escape(data.monitor.description)}</p></div></div></section> <section class="mx-auto flex-1 mt-8 flex-col mb-4 flex w-full" id="active_incident"><div class="container"><h1 class="mb-4 text-2xl font-bold leading-none">${validate_component(Badge, "Badge").$$render($$result, { variant: "outline text-2xl bg-red-500" }, {}, {
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
  })}` : `<div class="flex items-center justify-left"><p class="text-xl" data-svelte-h="svelte-18j567b">No active incidents</p></div>`}</div></section> ${validate_component(Separator, "Separator").$$render($$result, { class: "container mb-4 w-[400px]" }, {}, {})} <section class="mx-auto flex-1 mt-8 flex-col mb-4 flex w-full" id="active_incident"><div class="container"><h1 class="mb-4 text-2xl font-bold leading-none">${validate_component(Badge, "Badge").$$render($$result, { variant: "outline text-2xl bg-red-500" }, {}, {
    default: () => {
      return `Recent Incidents`;
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
  })}` : `<div class="flex items-center justify-left"><p class="text-xl" data-svelte-h="svelte-1q310fe">No recent incidents</p></div>`}</div></section>`;
});

export { Page as default };
//# sourceMappingURL=_page.svelte-9a970c64.js.map
