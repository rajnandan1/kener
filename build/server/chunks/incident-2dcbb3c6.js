import { c as create_ssr_component, f as compute_rest_props, g as spread, k as escape_attribute_value, h as escape_object, v as validate_component, e as escape, b as add_attribute, a as each } from './ssr-f056b9d4.js';
import { c as cn, i as is_void, C as Card, a as Card_content } from './Icon-2d61886b.js';
import 'clsx';
import './ctx-719e1af3.js';
import { S as StatusObj } from './helpers-0acb6e43.js';
import moment from 'moment';
import './index3-940e7b25.js';
import { B as Badge, a as Button } from './index4-9cd90a9b.js';
import { C as ChevronDown } from './chevron-down-afdb97a6.js';

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
const css = {
  code: ".toggle.svelte-1rrlwjr.svelte-1rrlwjr{display:none}.toggle.svelte-1rrlwjr.svelte-1rrlwjr{transition:all 0.15s ease-in-out}.toggle.open.svelte-1rrlwjr.svelte-1rrlwjr{transform:rotate(180deg)}.incident-div.svelte-1rrlwjr:hover .toggle.svelte-1rrlwjr{display:block}",
  map: null
};
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
  incident.comments = [];
  if ($$props.incident === void 0 && $$bindings.incident && incident !== void 0)
    $$bindings.incident(incident);
  if ($$props.variant === void 0 && $$bindings.variant && variant !== void 0)
    $$bindings.variant(variant);
  if ($$props.state === void 0 && $$bindings.state && state !== void 0)
    $$bindings.state(state);
  if ($$props.monitor === void 0 && $$bindings.monitor && monitor !== void 0)
    $$bindings.monitor(monitor);
  $$result.css.add(css);
  return `<div class="grid grid-cols-3 gap-4 mb-8 w-full incident-div svelte-1rrlwjr"><div class="col-span-3">${validate_component(Card, "Card.Root").$$render($$result, {}, {}, {
    default: () => {
      return `${validate_component(Card_header, "Card.Header").$$render($$result, {}, {}, {
        default: () => {
          return `${validate_component(Card_title, "Card.Title").$$render($$result, { class: "relative" }, {}, {
            default: () => {
              return `${incidentPriority != "" && incidentDuration > 0 ? `<p class="leading-10 absolute -top-11 -translate-y-1">${validate_component(Badge, "Badge").$$render(
                $$result,
                {
                  class: "text-[rgba(0,0,0,.6)] -ml-3 bg-card text-sm font-semibold text-" + StatusObj[incidentPriority] + " "
                },
                {},
                {
                  default: () => {
                    return `${escape(incidentPriority)} for ${escape(incidentDuration)} Minute${escape(incidentDuration > 1 ? "s" : "")}`;
                  }
                }
              )}</p>` : ``} ${variant.includes("monitor") ? `<div class="pb-4"><div class="scroll-m-20 text-2xl font-semibold tracking-tight">${monitor.image ? `<img${add_attribute("src", monitor.image, 0)} class="w-6 h-6 inline" alt="" srcset="">` : ``} ${escape(monitor.name)}</div></div>` : ``} ${variant.includes("title") ? `${escape(incident.title)}` : ``} ${incidentState == "open" ? `<span class="${"animate-ping absolute -left-[24px] -top-[24px] w-[8px] h-[8px] inline-flex rounded-full " + escape(blinker, true) + " opacity-75 svelte-1rrlwjr"}"></span>` : ``} ${variant.includes("body") || variant.includes("comments") ? `<div class="${"absolute right-4 toggle " + escape(state, true) + " svelte-1rrlwjr"}">${validate_component(Button, "Button").$$render(
                $$result,
                {
                  variant: "outline",
                  class: "rounded-full",
                  size: "icon"
                },
                {},
                {
                  default: () => {
                    return `${validate_component(ChevronDown, "ChevronDown").$$render($$result, { class: "text-muted-foreground", size: 24 }, {}, {})}`;
                  }
                }
              )}</div>` : ``}`;
            }
          })} ${validate_component(Card_description, "Card.Description").$$render($$result, {}, {}, {
            default: () => {
              return `${escape(moment(incidentCreatedAt * 1e3).format("MMMM Do YYYY, h:mm:ss a"))} <p class="mt-2 leading-8">${incident.labels.includes("identified") ? `<span class="mt-1 text-xs font-semibold me-2 px-2.5 py-1 uppercase leading-3 inline-block rounded tag-indetified" data-svelte-h="svelte-6pxpjr">Identified</span>` : ``} ${incident.labels.includes("resolved") ? `<span class="text-xs font-semibold me-2 px-2.5 py-1 leading-3 inline-block rounded uppercase tag-resolved" data-svelte-h="svelte-1ebh5g8">Resolved</span>` : ``} ${incident.labels.includes("maintenance") ? `<span class="text-xs font-semibold me-2 px-2.5 py-1 leading-3 inline-block rounded uppercase tag-maintenance" data-svelte-h="svelte-1t6rrxf">Maintenance</span>` : ``}</p>`;
            }
          })}`;
        }
      })} ${(variant.includes("body") || variant.includes("comments")) && state == "open" ? `${validate_component(Card_content, "Card.Content").$$render($$result, {}, {}, {
        default: () => {
          return `${variant.includes("body") ? `<div class="prose prose-stone dark:prose-invert max-w-none prose-code:px-[0.3rem] prose-code:py-[0.2rem] prose-code:font-mono prose-code:text-sm prose-code:rounded"><!-- HTML_TAG_START -->${incident.body}<!-- HTML_TAG_END --></div>` : ``} ${variant.includes("comments") && incident.comments?.length > 0 ? `<div class="ml-4 mt-8"><ol class="relative border-s border-secondary">${each(incident.comments, (comment) => {
            return `<li class="mb-10 ms-4"><div class="absolute w-3 h-3 rounded-full mt-1.5 -start-1.5 border bg-secondary border-secondary"></div> <time class="mb-1 text-sm font-normal leading-none text-muted-foreground">${escape(moment(comment.created_at).format("MMMM Do YYYY, h:mm:ss a"))}</time> <div class="mb-4 text-base font-normal wysiwyg dark:prose-invert prose prose-stone max-w-none prose-code:px-[0.3rem] prose-code:py-[0.2rem] prose-code:font-mono prose-code:text-sm prose-code:rounded"><!-- HTML_TAG_START -->${comment.body}<!-- HTML_TAG_END --></div> </li>`;
          })}</ol></div>` : `${`${validate_component(Skeleton, "Skeleton").$$render($$result, { class: "w-[100px] h-[20px] rounded-full" }, {}, {})}`}`}`;
        }
      })}` : ``}`;
    }
  })}</div> </div>`;
});

export { Card_header as C, Incident as I, Card_title as a, Card_description as b };
//# sourceMappingURL=incident-2dcbb3c6.js.map
