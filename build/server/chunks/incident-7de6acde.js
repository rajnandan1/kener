import { c as create_ssr_component, f as compute_rest_props, g as spread, k as escape_attribute_value, h as escape_object, v as validate_component, b as add_attribute, e as escape, a as each, d as subscribe } from './ssr-f056b9d4.js';
import { c as cn, i as is_void, C as Card, a as Card_content, b as createDispatcher, I as Icon$1, f as flyAndScale } from './Icon-c4d21504.js';
import 'clsx';
import { t as setCtx$3, u as getCtx$2, v as getAttrs$4 } from './ctx-a5738360.js';
import { d as derived } from './index2-ef0fcb8d.js';
import { S as StatusObj } from './helpers-1d8653cf.js';
import moment from 'moment';
import './index3-57e8b665.js';
import { a as Button, B as Badge } from './index4-56229f86.js';
import { C as ChevronDown } from './chevron-down-77916ef7.js';

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
  const { states: { open: localOpen }, updateOption, ids } = setCtx$3({
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
  const { elements: { content }, states: { open }, ids } = getCtx$2();
  $$unsubscribe_content = subscribe(content, (value) => $content = value);
  $$unsubscribe_open = subscribe(open, (value) => $open = value);
  const attrs = getAttrs$4("content");
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
  const { elements: { trigger }, ids } = getCtx$2();
  $$unsubscribe_trigger = subscribe(trigger, (value) => $trigger = value);
  createDispatcher();
  const attrs = getAttrs$4("trigger");
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
      return tag ? `<a${spread(
        [
          escape_object(builder2),
          escape_object($$restProps),
          escape_object(attrs)
        ],
        {}
      )}>${is_void(tag) ? "" : `${slots.default ? slots.default({ builder: builder2, attrs }) : ``}`}</a>` : "";
    })("a")}`;
  })()}`;
});
const Card_description = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["class"]);
  let { class: className = void 0 } = $$props;
  if ($$props.class === void 0 && $$bindings.class && className !== void 0)
    $$bindings.class(className);
  return `<p${spread(
    [
      {
        class: escape_attribute_value(cn("text-sm text-muted-foreground", className))
      },
      escape_object($$restProps)
    ],
    {}
  )}>${slots.default ? slots.default({}) : ``}</p>`;
});
const Card_header = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["class"]);
  let { class: className = void 0 } = $$props;
  if ($$props.class === void 0 && $$bindings.class && className !== void 0)
    $$bindings.class(className);
  return `<div${spread(
    [
      {
        class: escape_attribute_value(cn("flex flex-col space-y-1.5 p-6", className))
      },
      escape_object($$restProps)
    ],
    {}
  )}>${slots.default ? slots.default({}) : ``}</div>`;
});
const Card_title = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["class", "tag"]);
  let { class: className = void 0 } = $$props;
  let { tag = "h3" } = $$props;
  if ($$props.class === void 0 && $$bindings.class && className !== void 0)
    $$bindings.class(className);
  if ($$props.tag === void 0 && $$bindings.tag && tag !== void 0)
    $$bindings.tag(tag);
  return `${((tag$1) => {
    return tag$1 ? `<${tag}${spread(
      [
        {
          class: escape_attribute_value(cn("text-lg font-semibold leading-none tracking-tight", className))
        },
        escape_object($$restProps)
      ],
      {}
    )}>${is_void(tag$1) ? "" : `${slots.default ? slots.default({}) : ``}`}${is_void(tag$1) ? "" : `</${tag$1}>`}` : "";
  })(tag)}`;
});
const Chevron_up = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [["path", { "d": "m18 15-6-6-6 6" }]];
  return `${validate_component(Icon$1, "Icon").$$render($$result, Object.assign({}, { name: "chevron-up" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const ChevronUp = Chevron_up;
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
const Incident = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { incident } = $$props;
  let { variant = "title+body+comments+monitor" } = $$props;
  let { state = "open" } = $$props;
  let { monitor } = $$props;
  let blinker = "bg-transparent";
  let incidentPriority = "";
  let incidentDuration = 0;
  if (incident.labels.includes("incident-down")) {
    blinker = "bg-red-500";
    incidentPriority = "DOWN";
  } else if (incident.labels.includes("incident-degraded")) {
    blinker = "bg-yellow-500";
    incidentPriority = "DEGRADED";
  }
  let incidentState = incident.state;
  let incidentClosedAt = incident.incident_end_time;
  let incidentCreatedAt = incident.incident_start_time;
  if (!!incidentClosedAt && !!incidentCreatedAt) {
    incidentDuration = moment(incidentClosedAt * 1e3).add(1, "minutes").diff(moment(incidentCreatedAt * 1e3), "minutes");
  } else if (!!incidentCreatedAt) {
    incidentDuration = moment().diff(moment(incidentCreatedAt * 1e3), "minutes");
  }
  incident.body = incident.body.replace(/\[start_datetime:(\d+)\]/g, "");
  incident.body = incident.body.replace(/\[end_datetime:(\d+)\]/g, "");
  if ($$props.incident === void 0 && $$bindings.incident && incident !== void 0)
    $$bindings.incident(incident);
  if ($$props.variant === void 0 && $$bindings.variant && variant !== void 0)
    $$bindings.variant(variant);
  if ($$props.state === void 0 && $$bindings.state && state !== void 0)
    $$bindings.state(state);
  if ($$props.monitor === void 0 && $$bindings.monitor && monitor !== void 0)
    $$bindings.monitor(monitor);
  return `<div class="grid grid-cols-3 gap-4 mb-4 w-full"><div class="col-span-3">${validate_component(Card, "Card.Root").$$render($$result, {}, {}, {
    default: () => {
      return `${validate_component(Card_header, "Card.Header").$$render($$result, {}, {}, {
        default: () => {
          return `${validate_component(Card_title, "Card.Title").$$render($$result, { class: "relative" }, {}, {
            default: () => {
              return `${variant.includes("monitor") ? `<div class="pb-4"><div class="scroll-m-20 text-2xl font-semibold tracking-tight">${monitor.image ? `<img${add_attribute("src", monitor.image, 0)} class="w-6 h-6 inline" alt="" srcset="">` : ``} ${escape(monitor.name)} ${monitor.description ? `${validate_component(Root, "HoverCard.Root").$$render($$result, {}, {}, {
                default: () => {
                  return `${validate_component(Trigger, "HoverCard.Trigger").$$render($$result, {}, {}, {
                    default: () => {
                      return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide inline lucide-info"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>`;
                    }
                  })} ${validate_component(Hover_card_content, "HoverCard.Content").$$render($$result, { class: "dark:invert" }, {}, {
                    default: () => {
                      return `${escape(monitor.description)}`;
                    }
                  })}`;
                }
              })}` : ``}</div></div>` : ``} ${variant.includes("title") ? `${escape(incident.title)}` : ``} ${incidentState == "open" ? `<span class="${"animate-ping absolute -left-[24px] -top-[24px] w-[8px] h-[8px] inline-flex rounded-full " + escape(blinker, true) + " opacity-75"}"></span>` : ``} ${variant.includes("body") || variant.includes("comments") ? `${state == "close" ? `${validate_component(Button, "Button").$$render(
                $$result,
                {
                  variant: "outline",
                  class: "absolute right-0",
                  size: "icon"
                },
                {},
                {
                  default: () => {
                    return `${validate_component(ChevronDown, "ChevronDown").$$render($$result, { class: "", size: 32 }, {}, {})}`;
                  }
                }
              )}` : `${validate_component(Button, "Button").$$render(
                $$result,
                {
                  variant: "outline",
                  class: "absolute right-0",
                  size: "icon"
                },
                {},
                {
                  default: () => {
                    return `${validate_component(ChevronUp, "ChevronUp").$$render($$result, { class: "", size: 32 }, {}, {})}`;
                  }
                }
              )}`}` : ``}`;
            }
          })} ${validate_component(Card_description, "Card.Description").$$render($$result, {}, {}, {
            default: () => {
              return `${escape(moment(incidentCreatedAt * 1e3).format("MMMM Do YYYY, h:mm:ss a"))} ${incidentPriority != "" && incidentDuration > 0 ? `<p class="leading-10">${validate_component(Badge, "Badge").$$render(
                $$result,
                {
                  class: "text-[rgba(0,0,0,.6)] text-xs bg-" + StatusObj[incidentPriority]
                },
                {},
                {
                  default: () => {
                    return `${escape(incidentPriority)} for ${escape(incidentDuration)} minute${escape(incidentDuration > 1 ? "s" : "")}`;
                  }
                }
              )}</p>` : ``} <p class="mt-2">${incident.labels.includes("identified") ? `<span class="bg-yellow-100 text-yellow-800 mt-1 text-sm font-medium me-2 px-2.5 py-0.5 rounded dark:bg-yellow-900 dark:text-yellow-300" data-svelte-h="svelte-1shyy7e">Identified</span>` : ``} ${incident.labels.includes("resolved") ? `<span class="bg-green-100 text-green-800 text-sm font-medium me-2 px-2.5 py-0.5 rounded dark:bg-green-900 dark:text-green-300" data-svelte-h="svelte-h35mlk">Resolved</span>` : ``} ${incident.labels.includes("maintenance") ? `<span class="bg-blue-100 text-blue-800 text-sm font-medium me-2 px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300" data-svelte-h="svelte-h0k5w9">Maintenance</span>` : ``}</p>`;
            }
          })}`;
        }
      })} ${(variant.includes("body") || variant.includes("comments")) && state == "open" ? `${validate_component(Card_content, "Card.Content").$$render($$result, {}, {}, {
        default: () => {
          return `${variant.includes("body") ? `<div class="prose prose-stone dark:prose-invert max-w-none prose-code:px-[0.3rem] prose-code:py-[0.2rem] prose-code:font-mono prose-code:text-sm prose-code:rounded"><!-- HTML_TAG_START -->${incident.body}<!-- HTML_TAG_END --></div>` : ``} ${variant.includes("comments") && incident.comments.length > 0 ? `<div class="ml-4 mt-8"><ol class="relative border-s border-secondary">${each(incident.comments, (comment) => {
            return `<li class="mb-10 ms-4"><div class="absolute w-3 h-3 rounded-full mt-1.5 -start-1.5 border bg-secondary border-secondary"></div> <time class="mb-1 text-sm font-normal leading-none text-muted-foreground">${escape(moment(comment.created_at).format("MMMM Do YYYY, h:mm:ss a"))}</time> <div class="mb-4 text-base font-normal wysiwyg dark:prose-invert prose prose-stone max-w-none prose-code:px-[0.3rem] prose-code:py-[0.2rem] prose-code:font-mono prose-code:text-sm prose-code:rounded"><!-- HTML_TAG_START -->${comment.body}<!-- HTML_TAG_END --></div> </li>`;
          })}</ol></div>` : ``}`;
        }
      })}` : ``}`;
    }
  })}</div></div>`;
});

export { Card_header as C, Incident as I, Card_title as a, Card_description as b };
//# sourceMappingURL=incident-7de6acde.js.map
