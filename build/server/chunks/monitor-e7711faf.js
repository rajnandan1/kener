import { c as create_ssr_component, k as createEventDispatcher, b as add_attribute, e as escape, v as validate_component, a as each, d as compute_rest_props, f as subscribe, g as spread, i as escape_object } from './ssr-3edfa391.js';
import 'clsx';
import { R as Root, T as Trigger, H as Hover_card_content, B as Badge } from './index4-b36fddc1.js';
import { c as cn, a as createDispatcher, t as setCtx$1, u as getCtx, v as setItemCtx, w as getRadioIndicator, I as Icon$1, x as builder, y as getAttrs$2, z as getAttrs$1, A as addMeltEventListener } from './Icon-8f6a4a04.js';
import { b as buttonVariants, B as Button } from './index3-f40f43ed.js';

function createLabel() {
  const root = builder("label", {
    action: (node) => {
      const mouseDown = addMeltEventListener(node, "mousedown", (e) => {
        if (!e.defaultPrevented && e.detail > 1) {
          e.preventDefault();
        }
      });
      return {
        destroy: mouseDown
      };
    }
  });
  return {
    elements: {
      root
    }
  };
}
const Label$1 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let builder2;
  let $$restProps = compute_rest_props($$props, ["asChild"]);
  let $root, $$unsubscribe_root;
  let { asChild = false } = $$props;
  const { elements: { root } } = createLabel();
  $$unsubscribe_root = subscribe(root, (value) => $root = value);
  createDispatcher();
  const attrs = getAttrs$2("root");
  if ($$props.asChild === void 0 && $$bindings.asChild && asChild !== void 0)
    $$bindings.asChild(asChild);
  builder2 = $root;
  $$unsubscribe_root();
  return `${asChild ? `${slots.default ? slots.default({ builder: builder2, attrs }) : ``}` : `<label${spread([escape_object(builder2), escape_object($$restProps), escape_object(attrs)], {})}>${slots.default ? slots.default({ builder: builder2, attrs }) : ``}</label>`}`;
});
const RadioGroup = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let builder2;
  let $$restProps = compute_rest_props($$props, ["required", "disabled", "value", "onValueChange", "loop", "orientation", "asChild"]);
  let $root, $$unsubscribe_root;
  let { required = void 0 } = $$props;
  let { disabled = void 0 } = $$props;
  let { value = void 0 } = $$props;
  let { onValueChange = void 0 } = $$props;
  let { loop = void 0 } = $$props;
  let { orientation = void 0 } = $$props;
  let { asChild = false } = $$props;
  const { elements: { root }, states: { value: localValue }, updateOption } = setCtx$1({
    required,
    disabled,
    defaultValue: value,
    loop,
    orientation,
    onValueChange: ({ next }) => {
      if (value !== next) {
        onValueChange?.(next);
        value = next;
      }
      return next;
    }
  });
  $$unsubscribe_root = subscribe(root, (value2) => $root = value2);
  const attrs = getAttrs$1("root");
  if ($$props.required === void 0 && $$bindings.required && required !== void 0)
    $$bindings.required(required);
  if ($$props.disabled === void 0 && $$bindings.disabled && disabled !== void 0)
    $$bindings.disabled(disabled);
  if ($$props.value === void 0 && $$bindings.value && value !== void 0)
    $$bindings.value(value);
  if ($$props.onValueChange === void 0 && $$bindings.onValueChange && onValueChange !== void 0)
    $$bindings.onValueChange(onValueChange);
  if ($$props.loop === void 0 && $$bindings.loop && loop !== void 0)
    $$bindings.loop(loop);
  if ($$props.orientation === void 0 && $$bindings.orientation && orientation !== void 0)
    $$bindings.orientation(orientation);
  if ($$props.asChild === void 0 && $$bindings.asChild && asChild !== void 0)
    $$bindings.asChild(asChild);
  value !== void 0 && localValue.set(value);
  {
    updateOption("required", required);
  }
  {
    updateOption("disabled", disabled);
  }
  {
    updateOption("loop", loop);
  }
  {
    updateOption("orientation", orientation);
  }
  builder2 = $root;
  $$unsubscribe_root();
  return `${asChild ? `${slots.default ? slots.default({ builder: builder2, attrs }) : ``}` : `<div${spread([escape_object(builder2), escape_object($$restProps), escape_object(attrs)], {})}>${slots.default ? slots.default({ builder: builder2, attrs }) : ``}</div>`}`;
});
const RadioGroupInput = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let builder2;
  let $$restProps = compute_rest_props($$props, ["asChild"]);
  let $hiddenInput, $$unsubscribe_hiddenInput;
  let { asChild = false } = $$props;
  const { elements: { hiddenInput } } = getCtx();
  $$unsubscribe_hiddenInput = subscribe(hiddenInput, (value) => $hiddenInput = value);
  const attrs = getAttrs$1("input");
  if ($$props.asChild === void 0 && $$bindings.asChild && asChild !== void 0)
    $$bindings.asChild(asChild);
  builder2 = $hiddenInput;
  $$unsubscribe_hiddenInput();
  return `${asChild ? `${slots.default ? slots.default({ builder: builder2, attrs }) : ``}` : `<input${spread([escape_object(builder2), escape_object($$restProps), escape_object(attrs)], {})}>`}`;
});
const RadioGroupItem = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let builder2;
  let $$restProps = compute_rest_props($$props, ["value", "disabled", "asChild"]);
  let $item, $$unsubscribe_item;
  let { value } = $$props;
  let { disabled = false } = $$props;
  let { asChild = false } = $$props;
  const { elements: { item } } = setItemCtx(value);
  $$unsubscribe_item = subscribe(item, (value2) => $item = value2);
  createDispatcher();
  const attrs = getAttrs$1("item");
  if ($$props.value === void 0 && $$bindings.value && value !== void 0)
    $$bindings.value(value);
  if ($$props.disabled === void 0 && $$bindings.disabled && disabled !== void 0)
    $$bindings.disabled(disabled);
  if ($$props.asChild === void 0 && $$bindings.asChild && asChild !== void 0)
    $$bindings.asChild(asChild);
  builder2 = $item({ value, disabled });
  $$unsubscribe_item();
  return `${asChild ? `${slots.default ? slots.default({ builder: builder2, attrs }) : ``}` : `<button${spread(
    [
      escape_object(builder2),
      { type: "button" },
      escape_object($$restProps),
      escape_object(attrs)
    ],
    {}
  )}>${slots.default ? slots.default({ builder: builder2, attrs }) : ``}</button>`}`;
});
const RadioGroupItemIndicator = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $isChecked, $$unsubscribe_isChecked;
  const { isChecked, value } = getRadioIndicator();
  $$unsubscribe_isChecked = subscribe(isChecked, (value2) => $isChecked = value2);
  $$unsubscribe_isChecked();
  return `${$isChecked(value) ? `${slots.default ? slots.default({}) : ``}` : ``}`;
});
const Arrow_right = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [["path", { "d": "M5 12h14" }], ["path", { "d": "m12 5 7 7-7 7" }]];
  return `${validate_component(Icon$1, "Icon").$$render($$result, Object.assign({}, { name: "arrow-right" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const ArrowRight = Arrow_right;
const Circle = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [["circle", { "cx": "12", "cy": "12", "r": "10" }]];
  return `${validate_component(Icon$1, "Icon").$$render($$result, Object.assign({}, { name: "circle" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Circle$1 = Circle;
const Code = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    ["polyline", { "points": "16 18 22 12 16 6" }],
    ["polyline", { "points": "8 6 2 12 8 18" }]
  ];
  return `${validate_component(Icon$1, "Icon").$$render($$result, Object.assign({}, { name: "code" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Code$1 = Code;
const Info = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    ["circle", { "cx": "12", "cy": "12", "r": "10" }],
    ["path", { "d": "M12 16v-4" }],
    ["path", { "d": "M12 8h.01" }]
  ];
  return `${validate_component(Icon$1, "Icon").$$render($$result, Object.assign({}, { name: "info" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Info$1 = Info;
const Link = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    [
      "path",
      {
        "d": "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
      }
    ],
    [
      "path",
      {
        "d": "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
      }
    ]
  ];
  return `${validate_component(Icon$1, "Icon").$$render($$result, Object.assign({}, { name: "link" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Link$1 = Link;
const Share_2 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    ["circle", { "cx": "18", "cy": "5", "r": "3" }],
    ["circle", { "cx": "6", "cy": "12", "r": "3" }],
    ["circle", { "cx": "18", "cy": "19", "r": "3" }],
    [
      "line",
      {
        "x1": "8.59",
        "x2": "15.42",
        "y1": "13.51",
        "y2": "17.49"
      }
    ],
    [
      "line",
      {
        "x1": "15.41",
        "x2": "8.59",
        "y1": "6.51",
        "y2": "10.49"
      }
    ]
  ];
  return `${validate_component(Icon$1, "Icon").$$render($$result, Object.assign({}, { name: "share-2" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Share2 = Share_2;
const Radio_group = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["class", "value"]);
  let { class: className = void 0 } = $$props;
  let { value = void 0 } = $$props;
  if ($$props.class === void 0 && $$bindings.class && className !== void 0)
    $$bindings.class(className);
  if ($$props.value === void 0 && $$bindings.value && value !== void 0)
    $$bindings.value(value);
  let $$settled;
  let $$rendered;
  let previous_head = $$result.head;
  do {
    $$settled = true;
    $$result.head = previous_head;
    $$rendered = `${validate_component(RadioGroup, "RadioGroupPrimitive.Root").$$render(
      $$result,
      Object.assign({}, { class: cn("grid gap-2", className) }, $$restProps, { value }),
      {
        value: ($$value) => {
          value = $$value;
          $$settled = false;
        }
      },
      {
        default: () => {
          return `${slots.default ? slots.default({}) : ``}`;
        }
      }
    )}`;
  } while (!$$settled);
  return $$rendered;
});
const Radio_group_item = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["class", "value"]);
  let { class: className = void 0 } = $$props;
  let { value } = $$props;
  if ($$props.class === void 0 && $$bindings.class && className !== void 0)
    $$bindings.class(className);
  if ($$props.value === void 0 && $$bindings.value && value !== void 0)
    $$bindings.value(value);
  return `${validate_component(RadioGroupItem, "RadioGroupPrimitive.Item").$$render(
    $$result,
    Object.assign(
      {},
      { value },
      {
        class: cn("aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50", className)
      },
      $$restProps
    ),
    {},
    {
      default: () => {
        return `<div class="flex items-center justify-center">${validate_component(RadioGroupItemIndicator, "RadioGroupPrimitive.ItemIndicator").$$render($$result, {}, {}, {
          default: () => {
            return `${validate_component(Circle$1, "Circle").$$render(
              $$result,
              {
                class: "h-2.5 w-2.5 fill-current text-current"
              },
              {},
              {}
            )}`;
          }
        })}</div>`;
      }
    }
  )}`;
});
const Input = RadioGroupInput;
const Label = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["class"]);
  let { class: className = void 0 } = $$props;
  if ($$props.class === void 0 && $$bindings.class && className !== void 0)
    $$bindings.class(className);
  return `${validate_component(Label$1, "LabelPrimitive.Root").$$render(
    $$result,
    Object.assign(
      {},
      {
        class: cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)
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
const css = {
  code: ".daygrid90.svelte-1cihxcj.svelte-1cihxcj{-ms-overflow-style:none;scrollbar-width:none}.daygrid90.svelte-1cihxcj.svelte-1cihxcj::-webkit-scrollbar{display:none}.monitor.svelte-1cihxcj .menu-monitor.svelte-1cihxcj{visibility:hidden}.monitor.svelte-1cihxcj:hover .menu-monitor.svelte-1cihxcj{visibility:visible}",
  map: null
};
const Monitor = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  createEventDispatcher();
  let { monitor } = $$props;
  let { localTz } = $$props;
  let _90Day = monitor.pageData._90Day;
  let uptime0Day = monitor.pageData.uptime0Day;
  let uptime90Day = monitor.pageData.uptime90Day;
  monitor.pageData.dailyUps;
  monitor.pageData.dailyDown;
  monitor.pageData.dailyDegraded;
  let theme = "light";
  let embedType = "js";
  let todayDD = Object.keys(_90Day)[Object.keys(_90Day).length - 1];
  if ($$props.monitor === void 0 && $$bindings.monitor && monitor !== void 0)
    $$bindings.monitor(monitor);
  if ($$props.localTz === void 0 && $$bindings.localTz && localTz !== void 0)
    $$bindings.localTz(localTz);
  $$result.css.add(css);
  let $$settled;
  let $$rendered;
  let previous_head = $$result.head;
  do {
    $$settled = true;
    $$result.head = previous_head;
    $$rendered = `<div class="grid grid-cols-12 gap-4 monitor pb-4 svelte-1cihxcj">${monitor.embed === void 0 ? `<div class="col-span-12 md:col-span-4"><div class="pt-1"><div class="scroll-m-20 text-2xl font-semibold tracking-tight">${monitor.image ? `<img${add_attribute("src", monitor.image, 0)} class="w-6 h-6 inline"${add_attribute("alt", monitor.name, 0)} srcset="">` : ``} ${escape(monitor.name)} ${monitor.description ? `${validate_component(Root, "HoverCard.Root").$$render($$result, {}, {}, {
      default: () => {
        return `${validate_component(Trigger, "HoverCard.Trigger").$$render($$result, {}, {}, {
          default: () => {
            return `<span class="${"pt-0 pl-1 menu-monitor pr-0 pb-0 " + escape(buttonVariants({ variant: "link" }), true) + " svelte-1cihxcj"}">${validate_component(Info$1, "Info").$$render($$result, { size: 16 }, {}, {})}</span>`;
          }
        })} ${validate_component(Hover_card_content, "HoverCard.Content").$$render($$result, { class: "text-sm" }, {}, {
          default: () => {
            return `<h2 class="mb-2 text-lg font-semibold">${escape(monitor.name)}</h2> <span class="text-muted-foreground text-sm"><!-- HTML_TAG_START -->${monitor.description}<!-- HTML_TAG_END --></span>`;
          }
        })}`;
      }
    })}` : ``} ${validate_component(Root, "HoverCard.Root").$$render($$result, {}, {}, {
      default: () => {
        return `${validate_component(Trigger, "HoverCard.Trigger").$$render($$result, {}, {}, {
          default: () => {
            return `<span class="${"pt-0 pl-1 pb-0 menu-monitor pr-0 " + escape(buttonVariants({ variant: "link" }), true) + " svelte-1cihxcj"}">${validate_component(Share2, "Share2").$$render($$result, { size: 16 }, {}, {})}</span>`;
          }
        })} ${validate_component(Hover_card_content, "HoverCard.Content").$$render($$result, { class: " pl-1 pr-1 pb-1" }, {}, {
          default: () => {
            return `<h2 class="mb-1 text-lg font-semibold px-2" data-svelte-h="svelte-e3fjsq">Share</h2> <p class="pl-2 mb-2 text-muted-foreground text-sm" data-svelte-h="svelte-q5xjc3">Share this monitor using a link with others.</p> ${validate_component(Button, "Button").$$render($$result, { class: "ml-2", variant: "secondary" }, {}, {
              default: () => {
                return `${`${validate_component(Link$1, "Link").$$render($$result, { class: "inline mr-2", size: 12 }, {}, {})} <span class="text-sm font-medium" data-svelte-h="svelte-nz8t1u">Copy Link</span>`}`;
              }
            })} <h2 class="mb-2 mt-2 text-lg font-semibold px-2" data-svelte-h="svelte-13pn751">Embed</h2> <p class="pl-2 mb-2 text-muted-foreground text-sm" data-svelte-h="svelte-pju5ue">Embed this monitor using &lt;script&gt; or &lt;iframe&gt; in your app.</p> <div class="grid grid-cols-2 gap-2"><div class="col-span-1 pl-4"><h3 class="text-sm mb-2 text-muted-foreground" data-svelte-h="svelte-1p0yog8">Theme</h3> ${validate_component(Radio_group, "RadioGroup.Root").$$render(
              $$result,
              { value: theme },
              {
                value: ($$value) => {
                  theme = $$value;
                  $$settled = false;
                }
              },
              {
                default: () => {
                  return `<div class="flex items-center space-x-2">${validate_component(Radio_group_item, "RadioGroup.Item").$$render($$result, { value: "light", id: "light-theme" }, {}, {})} ${validate_component(Label, "Label").$$render($$result, { for: "light-theme" }, {}, {
                    default: () => {
                      return `Light`;
                    }
                  })}</div> <div class="flex items-center space-x-2">${validate_component(Radio_group_item, "RadioGroup.Item").$$render($$result, { value: "dark", id: "dark-theme" }, {}, {})} ${validate_component(Label, "Label").$$render($$result, { for: "dark-theme" }, {}, {
                    default: () => {
                      return `Dark`;
                    }
                  })}</div> ${validate_component(Input, "RadioGroup.Input").$$render($$result, { name: "theme" }, {}, {})}`;
                }
              }
            )}</div> <div class="col-span-1 pl-2"><h3 class="text-sm mb-2 text-muted-foreground" data-svelte-h="svelte-11r31s2">Mode</h3> ${validate_component(Radio_group, "RadioGroup.Root").$$render(
              $$result,
              { value: embedType },
              {
                value: ($$value) => {
                  embedType = $$value;
                  $$settled = false;
                }
              },
              {
                default: () => {
                  return `<div class="flex items-center space-x-2">${validate_component(Radio_group_item, "RadioGroup.Item").$$render($$result, { value: "js", id: "js-embed" }, {}, {})} ${validate_component(Label, "Label").$$render($$result, { for: "js-embed" }, {}, {
                    default: () => {
                      return `&lt;script&gt;`;
                    }
                  })}</div> <div class="flex items-center space-x-2">${validate_component(Radio_group_item, "RadioGroup.Item").$$render($$result, { value: "iframe", id: "iframe-embed" }, {}, {})} ${validate_component(Label, "Label").$$render($$result, { for: "iframe-embed" }, {}, {
                    default: () => {
                      return `&lt;iframe&gt;`;
                    }
                  })}</div> ${validate_component(Input, "RadioGroup.Input").$$render($$result, { name: "embed" }, {}, {})}`;
                }
              }
            )}</div></div> ${validate_component(Button, "Button").$$render(
              $$result,
              {
                class: "mb-2 mt-4 ml-2",
                variant: "secondary"
              },
              {},
              {
                default: () => {
                  return `${`${validate_component(Code$1, "Code").$$render($$result, { class: "inline mr-2", size: 12 }, {}, {})} <span class="text-sm font-medium" data-svelte-h="svelte-179knlb">Copy Code</span>`}`;
                }
              }
            )}`;
          }
        })}`;
      }
    })}</div></div> <div class="mt-2"><div class="grid grid-cols-2 gap-0"><div class="col-span-1 -mt-2"><a href="${"/incident/" + escape(monitor.folderName, true) + "#past_incident"}" class="${"pt-0 pl-0 pb-0 text-indigo-500 text-left " + escape(buttonVariants({ variant: "link" }), true) + " svelte-1cihxcj"}">Recent Incidents ${validate_component(ArrowRight, "ArrowRight").$$render($$result, { size: 16 }, {}, {})}</a></div></div></div></div>` : ``} <div class="${"col-span-12 " + escape(monitor.embed === void 0 ? "md:col-span-8" : "", true) + " pt-2"}"><div class="grid grid-cols-12"><div class="${escape(
      monitor.embed === void 0 ? "col-span-12" : "col-span-8",
      true
    ) + " md:col-span-8 h-[32px]"}"><button class="inline-block">${validate_component(Badge, "Badge").$$render(
      $$result,
      {
        variant: ""
      },
      {},
      {
        default: () => {
          return `90 Day ► ${escape(uptime90Day)}%`;
        }
      }
    )}</button> <button>${validate_component(Badge, "Badge").$$render($$result, { variant: "outline" }, {}, {
      default: () => {
        return `Today ► ${escape(uptime0Day)}%`;
      }
    })}</button></div> <div class="${escape(
      monitor.embed === void 0 ? "col-span-12" : "col-span-4",
      true
    ) + " md:col-span-4 text-right h-[32px]"}">${_90Day[todayDD] ? `<div class="${"text-api-up " + escape(monitor.embed === void 0 ? "md:pr-6" : "", true) + " text-sm font-semibold mt-[4px] text-" + escape(_90Day[todayDD].cssClass, true) + " svelte-1cihxcj"}">${escape(_90Day[todayDD].message)}</div>` : ``}</div></div> <div class="grid grid-cols-12">${`<div class="chart-status relative mt-1 col-span-12"><div class="flex overflow-x-auto daygrid90 overflow-y-hidden svelte-1cihxcj">${each(Object.entries(_90Day), ([ts, bar]) => {
      return `<div class="h-[30px] w-[6px] rounded-sm oneline"><div class="${"h-[30px] bg-" + escape(bar.cssClass, true) + " w-[4px] rounded-sm mr-[2px] svelte-1cihxcj"}"></div></div> <div class="absolute show-hover text-sm bg-background"><div class="${"text-" + escape(bar.cssClass, true) + " font-semibold svelte-1cihxcj"}">${bar.message != "No Data" ? `● ${escape(new Date(bar.timestamp * 1e3).toLocaleDateString())} ${escape(bar.message)}` : `● ${escape(new Date(bar.timestamp * 1e3).toLocaleDateString())} ${escape(bar.message)}`}</div> </div>`;
    })}</div></div>`}</div></div> </div>`;
  } while (!$$settled);
  return $$rendered;
});

export { Monitor as M };
//# sourceMappingURL=monitor-e7711faf.js.map
