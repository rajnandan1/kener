import { c as create_ssr_component, v as validate_component, b as add_attribute, e as escape, a as each, d as compute_rest_props, g as spread, h as escape_attribute_value, i as escape_object } from './ssr-3edfa391.js';
import { C as Card, a as Card_content } from './card-content-7a973783.js';
import { c as cn, i as is_void, I as Icon$1 } from './Icon-8f6a4a04.js';
import 'clsx';
import { R as Root, T as Trigger, H as Hover_card_content } from './index4-b36fddc1.js';
import { S as StatusObj } from './helpers-1d8653cf.js';
import moment from 'moment';
import { B as Button } from './index3-f40f43ed.js';
import { C as ChevronDown } from './chevron-down-abad86ac.js';

const Chevron_up = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [["path", { "d": "m18 15-6-6-6 6" }]];
  return `${validate_component(Icon$1, "Icon").$$render($$result, Object.assign({}, { name: "chevron-up" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const ChevronUp = Chevron_up;
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
const Incident = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { incident } = $$props;
  let { variant = "title+body+comments+monitor" } = $$props;
  let { state = "open" } = $$props;
  let { monitor } = $$props;
  let blinker = "bg-transparent";
  let incidentPriority = "";
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
  let incidentMessage = "";
  if (!!incidentClosedAt && !!incidentCreatedAt) {
    let diff = moment(incidentClosedAt * 1e3).diff(moment(incidentCreatedAt * 1e3), "minutes");
    if (diff > 0) {
      incidentMessage = `. Was <span class="text-${StatusObj[incidentPriority]}">${incidentPriority}</span>  for ${diff} minutes`;
    }
  } else if (!!incidentCreatedAt) {
    let diff = moment().diff(moment(incidentCreatedAt * 1e3), "minutes");
    incidentMessage = `. Has been <span class="text-${StatusObj[incidentPriority]}">${incidentPriority}</span> for ${diff} minutes`;
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
              return `${escape(moment(incidentCreatedAt * 1e3).format("MMMM Do YYYY, h:mm:ss a"))} <!-- HTML_TAG_START -->${incidentMessage}<!-- HTML_TAG_END --> <p class="mt-2">${incident.labels.includes("identified") ? `<span class="bg-yellow-100 text-yellow-800 mt-1 text-sm font-medium me-2 px-2.5 py-0.5 rounded dark:bg-yellow-900 dark:text-yellow-300" data-svelte-h="svelte-1shyy7e">Identified</span>` : ``} ${incident.labels.includes("resolved") ? `<span class="bg-green-100 text-green-800 text-sm font-medium me-2 px-2.5 py-0.5 rounded dark:bg-green-900 dark:text-green-300" data-svelte-h="svelte-h35mlk">Resolved</span>` : ``}</p>`;
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

export { Incident as I };
//# sourceMappingURL=incident-2c9cee56.js.map
