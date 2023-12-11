import { c as create_ssr_component, e as escape, v as validate_component, a as each, h as compute_rest_props, i as spread, j as escape_attribute_value, k as escape_object, d as validate_store, f as subscribe } from './ssr-04a1ecec.js';
import { C as Card, a as Card_content, c as cn, d as badgeVariants, b as createDispatcher, e as cubicOut } from './index4-45a0d67c.js';
import 'clsx';
import { v as validate_dynamic_element, a as validate_void_dynamic_element, i as is_void, c as setCtx$2, d as getCtx$1, e as setCtx, f as getAttrs$2, h as getAttrs } from './ctx-d6e03269.js';
import moment from 'moment';
import { I as Icon$1 } from './Icon-0028b73d.js';
import 'tailwind-merge';
import 'tailwind-variants';
import './index3-b6b9df09.js';

const Chevron_down = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [["path", { "d": "m6 9 6 6 6-6" }]];
  return `${validate_component(Icon$1, "Icon").$$render($$result, Object.assign({}, { name: "chevron-down" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const ChevronDown = Chevron_down;
const Collapsible = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let builder;
  let $$restProps = compute_rest_props($$props, ["forceVisible", "disabled", "open", "onOpenChange", "asChild"]);
  let $root, $$unsubscribe_root;
  let { forceVisible = false } = $$props;
  let { disabled = void 0 } = $$props;
  let { open = void 0 } = $$props;
  let { onOpenChange = void 0 } = $$props;
  let { asChild = false } = $$props;
  const { elements: { root }, states: { open: localOpen }, updateOption } = setCtx$2({
    disabled,
    forceVisible,
    defaultOpen: open,
    onOpenChange: ({ next }) => {
      if (open !== next) {
        onOpenChange?.(next);
        open = next;
      }
      return next;
    }
  });
  validate_store(root, "root");
  $$unsubscribe_root = subscribe(root, (value) => $root = value);
  const attrs = getAttrs$2("root");
  if ($$props.forceVisible === void 0 && $$bindings.forceVisible && forceVisible !== void 0)
    $$bindings.forceVisible(forceVisible);
  if ($$props.disabled === void 0 && $$bindings.disabled && disabled !== void 0)
    $$bindings.disabled(disabled);
  if ($$props.open === void 0 && $$bindings.open && open !== void 0)
    $$bindings.open(open);
  if ($$props.onOpenChange === void 0 && $$bindings.onOpenChange && onOpenChange !== void 0)
    $$bindings.onOpenChange(onOpenChange);
  if ($$props.asChild === void 0 && $$bindings.asChild && asChild !== void 0)
    $$bindings.asChild(asChild);
  open !== void 0 && localOpen.set(open);
  {
    updateOption("disabled", disabled);
  }
  {
    updateOption("forceVisible", forceVisible);
  }
  builder = $root;
  $$unsubscribe_root();
  return `${asChild ? `${slots.default ? slots.default({ builder, attrs }) : ``}` : `<div${spread([escape_object(builder), escape_object($$restProps), escape_object(attrs)], {})}>${slots.default ? slots.default({ builder, attrs }) : ``}</div>`}`;
});
const CollapsibleContent = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let builder;
  let $$restProps = compute_rest_props($$props, [
    "transition",
    "transitionConfig",
    "inTransition",
    "inTransitionConfig",
    "outTransition",
    "outTransitionConfig",
    "asChild"
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
  const { elements: { content }, states: { open } } = getCtx$1();
  validate_store(content, "content");
  $$unsubscribe_content = subscribe(content, (value) => $content = value);
  validate_store(open, "open");
  $$unsubscribe_open = subscribe(open, (value) => $open = value);
  const attrs = getAttrs$2("content");
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
  builder = $content;
  $$unsubscribe_content();
  $$unsubscribe_open();
  return `${asChild && $open ? `${slots.default ? slots.default({ builder, attrs }) : ``}` : `${transition && $open ? `<div${spread([escape_object(builder), escape_object($$restProps), escape_object(attrs)], {})}>${slots.default ? slots.default({ builder, attrs }) : ``}</div>` : `${inTransition && outTransition && $open ? `<div${spread([escape_object(builder), escape_object($$restProps), escape_object(attrs)], {})}>${slots.default ? slots.default({ builder, attrs }) : ``}</div>` : `${inTransition && $open ? `<div${spread(
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
const CollapsibleTrigger = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let builder;
  let $$restProps = compute_rest_props($$props, ["asChild"]);
  let $trigger, $$unsubscribe_trigger;
  let { asChild = false } = $$props;
  const { elements: { trigger } } = getCtx$1();
  validate_store(trigger, "trigger");
  $$unsubscribe_trigger = subscribe(trigger, (value) => $trigger = value);
  createDispatcher();
  const attrs = getAttrs$2("trigger");
  if ($$props.asChild === void 0 && $$bindings.asChild && asChild !== void 0)
    $$bindings.asChild(asChild);
  builder = $trigger;
  $$unsubscribe_trigger();
  return `${asChild ? `${slots.default ? slots.default({ builder, attrs }) : ``}` : `<button${spread(
    [
      escape_object(builder),
      { type: "button" },
      escape_object($$restProps),
      escape_object(attrs)
    ],
    {}
  )}>${slots.default ? slots.default({ builder, attrs }) : ``}</button>`}`;
});
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
    validate_dynamic_element(tag$1);
    return tag$1 ? (() => {
      validate_void_dynamic_element(tag$1);
      return `<${tag}${spread(
        [
          {
            class: escape_attribute_value(cn("text-lg font-semibold leading-none tracking-tight", className))
          },
          escape_object($$restProps)
        ],
        {}
      )}>${is_void(tag$1) ? "" : `${slots.default ? slots.default({}) : ``}`}${is_void(tag$1) ? "" : `</${tag$1}>`}`;
    })() : "";
  })(tag)}`;
});
const Badge = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["class", "href", "variant"]);
  let { class: className = void 0 } = $$props;
  let { href = void 0 } = $$props;
  let { variant = "default" } = $$props;
  if ($$props.class === void 0 && $$bindings.class && className !== void 0)
    $$bindings.class(className);
  if ($$props.href === void 0 && $$bindings.href && href !== void 0)
    $$bindings.href(href);
  if ($$props.variant === void 0 && $$bindings.variant && variant !== void 0)
    $$bindings.variant(variant);
  return `${((tag) => {
    validate_dynamic_element(tag);
    return tag ? (() => {
      validate_void_dynamic_element(tag);
      return `<${href ? "a" : "span"}${spread(
        [
          { href: escape_attribute_value(href) },
          {
            class: escape_attribute_value(cn(badgeVariants({ variant, className })))
          },
          escape_object($$restProps)
        ],
        {}
      )}>${is_void(tag) ? "" : `${slots.default ? slots.default({}) : ``}`}${is_void(tag) ? "" : `</${tag}>`}`;
    })() : "";
  })(href ? "a" : "span")}`;
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
function slide(node, { delay = 0, duration = 400, easing = cubicOut, axis = "y" } = {}) {
  const style = getComputedStyle(node);
  const opacity = +style.opacity;
  const primary_property = axis === "y" ? "height" : "width";
  const primary_property_value = parseFloat(style[primary_property]);
  const secondary_properties = axis === "y" ? ["top", "bottom"] : ["left", "right"];
  const capitalized_secondary_properties = secondary_properties.map(
    (e) => `${e[0].toUpperCase()}${e.slice(1)}`
  );
  const padding_start_value = parseFloat(style[`padding${capitalized_secondary_properties[0]}`]);
  const padding_end_value = parseFloat(style[`padding${capitalized_secondary_properties[1]}`]);
  const margin_start_value = parseFloat(style[`margin${capitalized_secondary_properties[0]}`]);
  const margin_end_value = parseFloat(style[`margin${capitalized_secondary_properties[1]}`]);
  const border_width_start_value = parseFloat(
    style[`border${capitalized_secondary_properties[0]}Width`]
  );
  const border_width_end_value = parseFloat(
    style[`border${capitalized_secondary_properties[1]}Width`]
  );
  return {
    delay,
    duration,
    easing,
    css: (t) => `overflow: hidden;opacity: ${Math.min(t * 20, 1) * opacity};${primary_property}: ${t * primary_property_value}px;padding-${secondary_properties[0]}: ${t * padding_start_value}px;padding-${secondary_properties[1]}: ${t * padding_end_value}px;margin-${secondary_properties[0]}: ${t * margin_start_value}px;margin-${secondary_properties[1]}: ${t * margin_end_value}px;border-${secondary_properties[0]}-width: ${t * border_width_start_value}px;border-${secondary_properties[1]}-width: ${t * border_width_end_value}px;`
  };
}
const Collapsible_content = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["transition", "transitionConfig"]);
  let { transition = slide } = $$props;
  let { transitionConfig = { duration: 150 } } = $$props;
  if ($$props.transition === void 0 && $$bindings.transition && transition !== void 0)
    $$bindings.transition(transition);
  if ($$props.transitionConfig === void 0 && $$bindings.transitionConfig && transitionConfig !== void 0)
    $$bindings.transitionConfig(transitionConfig);
  return `${validate_component(CollapsibleContent, "CollapsiblePrimitive.Content").$$render($$result, Object.assign({}, { transition }, { transitionConfig }, $$restProps), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Root = Collapsible;
const Trigger = CollapsibleTrigger;
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { data } = $$props;
  if ($$props.data === void 0 && $$bindings.data && data !== void 0)
    $$bindings.data(data);
  return `<section class="mx-auto flex w-full max-w-4xl flex-1 flex-col items-start justify-center"><div class="mx-auto max-w-screen-xl px-4 pt-32 pb-16 lg:flex lg:items-center"><div class="mx-auto max-w-3xl text-center blurry-bg"><h1 class="bg-gradient-to-r from-green-300 via-blue-500 to-purple-600 bg-clip-text text-5xl font-extrabold text-transparent leading-snug">${escape(data.monitor.name)}</h1> <p class="mx-auto mt-4 max-w-xl sm:text-xl">${escape(data.monitor.description)}</p></div></div></section> <section class="mx-auto flex-1 mt-8 flex-col mb-4 flex w-full" id="active_incident"><div class="container"><h1 class="mb-4 text-2xl font-bold leading-none">${validate_component(Badge, "Badge").$$render($$result, { variant: "outline text-2xl bg-red-500" }, {}, {
    default: () => {
      return `Active Incidents`;
    }
  })}</h1> ${data.activeIncidents.length > 0 ? `${each(data.activeIncidents, (incident) => {
    return `<div class="grid grid-cols-3 gap-4 mb-4"><div class="col-span-3">${validate_component(Card, "Card.Root").$$render($$result, {}, {}, {
      default: () => {
        return `${validate_component(Card_header, "Card.Header").$$render($$result, {}, {}, {
          default: () => {
            return `${validate_component(Card_title, "Card.Title").$$render($$result, { class: "relative" }, {}, {
              default: () => {
                return `${escape(incident.title)} <span class="animate-ping absolute -left-[24px] -top-[24px] w-[8px] h-[8px] inline-flex rounded-full h-3 w-3 bg-red-500 opacity-75"></span> `;
              }
            })} ${validate_component(Card_description, "Card.Description").$$render($$result, {}, {}, {
              default: () => {
                return `${escape(moment(incident.created_at).format("MMMM Do YYYY, h:mm:ss a"))} `;
              }
            })} `;
          }
        })} ${validate_component(Card_content, "Card.Content").$$render($$result, {}, {}, {
          default: () => {
            return `<div class="prose prose-stone dark:prose-invert max-w-none prose-code:bg-gray-200 prose-code:px-[0.3rem] prose-code:py-[0.2rem] prose-code:font-mono prose-code:text-sm prose-code:rounded"><!-- HTML_TAG_START -->${incident.body}<!-- HTML_TAG_END --></div> ${incident.comments.length > 0 ? `<div class="ml-4 mt-8"><ol class="relative border-s border-secondary">${each(incident.comments, (comment) => {
              return `<li class="mb-10 ms-4"><div class="absolute w-3 h-3 rounded-full mt-1.5 -start-1.5 border bg-secondary border-secondary"></div> <time class="mb-1 text-sm font-normal leading-none text-muted-foreground">${escape(moment(comment.created_at).format("MMMM Do YYYY, h:mm:ss a"))}</time> <div class="mb-4 text-base font-normal wysiwyg dark:prose-invert prose prose-stone max-w-none prose-code:px-[0.3rem] prose-code:py-[0.2rem] prose-code:font-mono prose-code:text-sm prose-code:rounded"><!-- HTML_TAG_START -->${comment.body}<!-- HTML_TAG_END --></div> </li>`;
            })}</ol> </div>` : ``} `;
          }
        })} `;
      }
    })}</div> </div>`;
  })}` : `<div class="flex items-center justify-left"><p class="text-xl" data-svelte-h="svelte-18j567b">No active incidents</p> <picture><source srcset="https://fonts.gstatic.com/s/e/notoemoji/latest/1f91e_1f3fb/512.webp" type="image/webp"> <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f91e_1f3fb/512.gif" alt="🤞" width="32" height="32"></picture></div>`}</div></section> ${validate_component(Separator, "Separator").$$render($$result, { class: "container mb-4 w-[400px]" }, {}, {})} <section class="mx-auto flex-1 mt-8 flex-col mb-4 flex w-full" id="past_incident"><div class="container"><h1 class="mb-4 text-2xl font-bold leading-none">${validate_component(Badge, "Badge").$$render($$result, { variant: "outline text-2xl bg-red-500" }, {}, {
    default: () => {
      return `Past Incidents`;
    }
  })}</h1> ${data.pastIncidents.length > 0 ? `${each(data.pastIncidents, (incident, i) => {
    return `<div class="grid grid-cols-3 gap-4 mb-4"><div class="col-span-3">${validate_component(Card, "Card.Root").$$render($$result, {}, {}, {
      default: () => {
        return `${validate_component(Root, "Collapsible.Root").$$render($$result, {}, {}, {
          default: () => {
            return `${validate_component(Trigger, "Collapsible.Trigger").$$render($$result, { class: "w-full text-left" }, {}, {
              default: () => {
                return `${validate_component(Card_header, "Card.Header").$$render($$result, { class: "relative" }, {}, {
                  default: () => {
                    return `${validate_component(Card_title, "Card.Title").$$render($$result, { class: "relative" }, {}, {
                      default: () => {
                        return `${escape(incident.title)} `;
                      }
                    })} ${validate_component(Card_description, "Card.Description").$$render($$result, {}, {}, {
                      default: () => {
                        return `${escape(moment(incident.created_at).format("MMMM Do YYYY, h:mm:ss a"))} `;
                      }
                    })} ${validate_component(ChevronDown, "ChevronDown").$$render($$result, { class: "absolute right-5", size: 32 }, {}, {})} `;
                  }
                })} `;
              }
            })} ${validate_component(Collapsible_content, "Collapsible.Content").$$render($$result, {}, {}, {
              default: () => {
                return `${validate_component(Card_content, "Card.Content").$$render($$result, {}, {}, {
                  default: () => {
                    return `<div class="prose prose-stone dark:prose-invert max-w-none prose-code:bg-gray-200 prose-code:px-[0.3rem] prose-code:py-[0.2rem] prose-code:font-mono prose-code:text-sm prose-code:rounded"><!-- HTML_TAG_START -->${incident.body}<!-- HTML_TAG_END --></div> ${incident.comments.length > 0 ? `<div class="ml-4 mt-8"><ol class="relative border-s border-secondary">${each(incident.comments, (comment) => {
                      return `<li class="mb-10 ms-4"><div class="absolute w-3 h-3 rounded-full mt-1.5 -start-1.5 border border-secondary bg-secondary"></div> <time class="mb-1 text-sm font-normal leading-none text-muted-foreground">${escape(moment(comment.created_at).format("MMMM Do YYYY, h:mm:ss a"))}</time> <div class="mb-4 wysiwyg text-base font-normal prose prose-stone max-w-none prose-code:bg-gray-200 prose-code:px-[0.3rem] prose-code:py-[0.2rem] prose-code:font-mono prose-code:text-sm prose-code:rounded"><!-- HTML_TAG_START -->${comment.body}<!-- HTML_TAG_END --></div> </li>`;
                    })}</ol> </div>` : ``} `;
                  }
                })} `;
              }
            })} `;
          }
        })} `;
      }
    })}</div> </div>`;
  })}` : `<div class="flex items-center justify-left"><p class="text-xl" data-svelte-h="svelte-ak4fah">No past incidents</p> <picture><source srcset="https://fonts.gstatic.com/s/e/notoemoji/latest/270c_1f3fb/512.webp" type="image/webp"> <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/270c_1f3fb/512.gif" alt="✌" width="32" height="32"></picture></div>`}</div></section>`;
});

export { Page as default };
//# sourceMappingURL=_page.svelte-2946da1d.js.map
