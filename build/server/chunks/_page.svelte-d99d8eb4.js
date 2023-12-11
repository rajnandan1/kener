import { c as create_ssr_component, b as add_attribute, e as escape, a as each, v as validate_component, h as compute_rest_props, i as spread, j as escape_attribute_value, k as escape_object, d as validate_store, f as subscribe } from './ssr-04a1ecec.js';
import { C as Card, a as Card_content, c as cn, b as createDispatcher, f as flyAndScale } from './index4-45a0d67c.js';
import 'clsx';
import { s as setCtx$1, g as getCtx, v as validate_dynamic_element, a as validate_void_dynamic_element, i as is_void, b as getAttrs$1 } from './ctx-d6e03269.js';
import { d as derived } from './index3-b6b9df09.js';
import './index2-5597d8a8.js';
import { tv } from 'tailwind-variants';
import 'tailwind-merge';

const LinkPreview = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $idValues, $$unsubscribe_idValues;
  let { positioning = void 0 } = $$props;
  let { open = void 0 } = $$props;
  let { onOpenChange = void 0 } = $$props;
  let { openDelay = 700 } = $$props;
  let { closeDelay = 300 } = $$props;
  let { closeOnOutsideClick = void 0 } = $$props;
  let { closeOnEscape = void 0 } = $$props;
  let { arrowSize = void 0 } = $$props;
  let { portal = void 0 } = $$props;
  const { states: { open: localOpen }, updateOption, ids } = setCtx$1({
    defaultOpen: open,
    positioning,
    openDelay,
    closeDelay,
    closeOnOutsideClick,
    closeOnEscape,
    arrowSize,
    portal,
    onOpenChange: ({ next }) => {
      if (open !== next) {
        onOpenChange?.(next);
        open = next;
      }
      return next;
    }
  });
  const idValues = derived([ids.content, ids.trigger], ([$contentId, $triggerId]) => ({ content: $contentId, trigger: $triggerId }));
  validate_store(idValues, "idValues");
  $$unsubscribe_idValues = subscribe(idValues, (value) => $idValues = value);
  if ($$props.positioning === void 0 && $$bindings.positioning && positioning !== void 0)
    $$bindings.positioning(positioning);
  if ($$props.open === void 0 && $$bindings.open && open !== void 0)
    $$bindings.open(open);
  if ($$props.onOpenChange === void 0 && $$bindings.onOpenChange && onOpenChange !== void 0)
    $$bindings.onOpenChange(onOpenChange);
  if ($$props.openDelay === void 0 && $$bindings.openDelay && openDelay !== void 0)
    $$bindings.openDelay(openDelay);
  if ($$props.closeDelay === void 0 && $$bindings.closeDelay && closeDelay !== void 0)
    $$bindings.closeDelay(closeDelay);
  if ($$props.closeOnOutsideClick === void 0 && $$bindings.closeOnOutsideClick && closeOnOutsideClick !== void 0)
    $$bindings.closeOnOutsideClick(closeOnOutsideClick);
  if ($$props.closeOnEscape === void 0 && $$bindings.closeOnEscape && closeOnEscape !== void 0)
    $$bindings.closeOnEscape(closeOnEscape);
  if ($$props.arrowSize === void 0 && $$bindings.arrowSize && arrowSize !== void 0)
    $$bindings.arrowSize(arrowSize);
  if ($$props.portal === void 0 && $$bindings.portal && portal !== void 0)
    $$bindings.portal(portal);
  open !== void 0 && localOpen.set(open);
  {
    updateOption("positioning", positioning);
  }
  {
    updateOption("openDelay", openDelay);
  }
  {
    updateOption("closeDelay", closeDelay);
  }
  {
    updateOption("closeOnOutsideClick", closeOnOutsideClick);
  }
  {
    updateOption("closeOnEscape", closeOnEscape);
  }
  {
    updateOption("arrowSize", arrowSize);
  }
  {
    updateOption("portal", portal);
  }
  $$unsubscribe_idValues();
  return `${slots.default ? slots.default({ ids: $idValues }) : ``}`;
});
const LinkPreviewContent = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let builder;
  let $$restProps = compute_rest_props($$props, [
    "transition",
    "transitionConfig",
    "inTransition",
    "inTransitionConfig",
    "outTransition",
    "outTransitionConfig",
    "asChild",
    "id"
  ]);
  let $content, $$unsubscribe_content;
  let $open, $$unsubscribe_open;
  let { transition = void 0 } = $$props;
  let { transitionConfig = void 0 } = $$props;
  let { inTransition = void 0 } = $$props;
  let { inTransitionConfig = void 0 } = $$props;
  let { outTransition = void 0 } = $$props;
  let { outTransitionConfig = void 0 } = $$props;
  let { asChild = false } = $$props;
  let { id = void 0 } = $$props;
  const { elements: { content }, states: { open }, ids } = getCtx();
  validate_store(content, "content");
  $$unsubscribe_content = subscribe(content, (value) => $content = value);
  validate_store(open, "open");
  $$unsubscribe_open = subscribe(open, (value) => $open = value);
  const attrs = getAttrs$1("content");
  createDispatcher();
  if ($$props.transition === void 0 && $$bindings.transition && transition !== void 0)
    $$bindings.transition(transition);
  if ($$props.transitionConfig === void 0 && $$bindings.transitionConfig && transitionConfig !== void 0)
    $$bindings.transitionConfig(transitionConfig);
  if ($$props.inTransition === void 0 && $$bindings.inTransition && inTransition !== void 0)
    $$bindings.inTransition(inTransition);
  if ($$props.inTransitionConfig === void 0 && $$bindings.inTransitionConfig && inTransitionConfig !== void 0)
    $$bindings.inTransitionConfig(inTransitionConfig);
  if ($$props.outTransition === void 0 && $$bindings.outTransition && outTransition !== void 0)
    $$bindings.outTransition(outTransition);
  if ($$props.outTransitionConfig === void 0 && $$bindings.outTransitionConfig && outTransitionConfig !== void 0)
    $$bindings.outTransitionConfig(outTransitionConfig);
  if ($$props.asChild === void 0 && $$bindings.asChild && asChild !== void 0)
    $$bindings.asChild(asChild);
  if ($$props.id === void 0 && $$bindings.id && id !== void 0)
    $$bindings.id(id);
  {
    if (id) {
      ids.content.set(id);
    }
  }
  builder = $content;
  $$unsubscribe_content();
  $$unsubscribe_open();
  return ` ${asChild && $open ? `${slots.default ? slots.default({ builder, attrs }) : ``}` : `${transition && $open ? `<div${spread([escape_object(builder), escape_object($$restProps), escape_object(attrs)], {})}>${slots.default ? slots.default({ builder, attrs }) : ``}</div>` : `${inTransition && outTransition && $open ? `<div${spread([escape_object(builder), escape_object($$restProps), escape_object(attrs)], {})}>${slots.default ? slots.default({ builder, attrs }) : ``}</div>` : `${inTransition && $open ? `<div${spread(
    [
      escape_object(builder),
      escape_object($$restProps),
      escape_object(attrs)
    ],
    {}
  )}>${slots.default ? slots.default({ builder, attrs }) : ``}</div>` : `${outTransition && $open ? `<div${spread(
    [
      escape_object(builder),
      escape_object($$restProps),
      escape_object(attrs)
    ],
    {}
  )}>${slots.default ? slots.default({ builder, attrs }) : ``}</div>` : `${$open ? `<div${spread(
    [
      escape_object(builder),
      escape_object($$restProps),
      escape_object(attrs)
    ],
    {}
  )}>${slots.default ? slots.default({ builder, attrs }) : ``}</div>` : ``}`}`}`}`}`}`;
});
const LinkPreviewTrigger = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let builder;
  let $$restProps = compute_rest_props($$props, ["asChild", "id"]);
  let $trigger, $$unsubscribe_trigger;
  let { asChild = false } = $$props;
  let { id = void 0 } = $$props;
  const { elements: { trigger }, ids } = getCtx();
  validate_store(trigger, "trigger");
  $$unsubscribe_trigger = subscribe(trigger, (value) => $trigger = value);
  createDispatcher();
  const attrs = getAttrs$1("trigger");
  if ($$props.asChild === void 0 && $$bindings.asChild && asChild !== void 0)
    $$bindings.asChild(asChild);
  if ($$props.id === void 0 && $$bindings.id && id !== void 0)
    $$bindings.id(id);
  {
    if (id) {
      ids.trigger.set(id);
    }
  }
  builder = $trigger;
  $$unsubscribe_trigger();
  return `${asChild ? `${slots.default ? slots.default({ attrs, builder }) : ``}` : (() => {
    let builder2 = $trigger;
    return ` ${((tag) => {
      validate_dynamic_element(tag);
      return tag ? (() => {
        validate_void_dynamic_element(tag);
        return `<a${spread(
          [
            escape_object(builder2),
            escape_object($$restProps),
            escape_object(attrs)
          ],
          {}
        )}>${is_void(tag) ? "" : `${slots.default ? slots.default({ builder: builder2, attrs }) : ``}`}</a>`;
      })() : "";
    })("a")}`;
  })()}`;
});
const Hover_card_content = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["class", "transition", "transitionConfig"]);
  let { class: className = void 0 } = $$props;
  let { transition = flyAndScale } = $$props;
  let { transitionConfig = void 0 } = $$props;
  if ($$props.class === void 0 && $$bindings.class && className !== void 0)
    $$bindings.class(className);
  if ($$props.transition === void 0 && $$bindings.transition && transition !== void 0)
    $$bindings.transition(transition);
  if ($$props.transitionConfig === void 0 && $$bindings.transitionConfig && transitionConfig !== void 0)
    $$bindings.transitionConfig(transitionConfig);
  return `${validate_component(LinkPreviewContent, "HoverCardPrimitive.Content").$$render(
    $$result,
    Object.assign(
      {},
      { transition },
      { transitionConfig },
      {
        class: cn("z-50 w-64 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none mt-3", className)
      },
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
const Root = LinkPreview;
const Trigger = LinkPreviewTrigger;
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
  var hours = date.getHours();
  var minutes = date.getMinutes();
  var totalMinutes = hours * 60 + minutes;
  return totalMinutes;
}
const Monitor = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { monitor } = $$props;
  getTodayDD();
  getminuteFromMidnightTillNow();
  if ($$props.monitor === void 0 && $$bindings.monitor && monitor !== void 0)
    $$bindings.monitor(monitor);
  return `<section class="mx-auto backdrop-blur-[2px] mb-8 flex w-full max-w-[890px] flex-1 flex-col items-start justify-center">${validate_component(Card, "Card.Root").$$render($$result, { class: "w-full" }, {}, {
    default: () => {
      return `${validate_component(Card_content, "Card.Content").$$render($$result, {}, {}, {
        default: () => {
          return `<div class="grid grid-cols-12 gap-4"><div class="col-span-12 md:col-span-4"><div class="pt-3"><div class="scroll-m-20 text-2xl font-semibold tracking-tight">${monitor.image ? `<img${add_attribute("src", monitor.image, 0)} class="w-6 h-6 inline" alt="" srcset="">` : ``} ${escape(monitor.name)} ${monitor.description ? `${validate_component(Root, "HoverCard.Root").$$render($$result, {}, {}, {
            default: () => {
              return `${validate_component(Trigger, "HoverCard.Trigger").$$render($$result, {}, {}, {
                default: () => {
                  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide inline lucide-info"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>`;
                }
              })} ${validate_component(Hover_card_content, "HoverCard.Content").$$render($$result, {}, {}, {
                default: () => {
                  return `${escape(monitor.description)}`;
                }
              })}`;
            }
          })}` : ``}</div></div> ${``}</div> <div class="col-span-12 md:col-span-8 pt-4">${`${validate_component(Skeleton, "Skeleton").$$render($$result, { class: "w-full h-[40px] mt-[7px]" }, {}, {})}`}</div></div>`;
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
//# sourceMappingURL=_page.svelte-d99d8eb4.js.map
