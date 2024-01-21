import { c as create_ssr_component, v as validate_component, e as escape, a as each, b as add_attribute, d as compute_rest_props, f as subscribe, g as spread, h as escape_attribute_value, i as escape_object } from './ssr-3edfa391.js';
import { B as Button } from './index3-f40f43ed.js';
import { c as cn, s as setCtx$3, g as getCtx$2, a as createDispatcher, b as getAttrs$4, d as disabledAttrs, i as is_void, e as setGroupCtx, f as getContent, I as Icon$1, h as flyAndScale } from './Icon-8f6a4a04.js';
import { d as derived } from './index2-c5c18f89.js';
import 'clsx';
import 'tailwind-variants';
import 'tailwind-merge';

const DropdownMenu = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $idValues, $$unsubscribe_idValues;
  let { closeOnOutsideClick = void 0 } = $$props;
  let { closeOnEscape = void 0 } = $$props;
  let { portal = void 0 } = $$props;
  let { forceVisible = void 0 } = $$props;
  let { open = void 0 } = $$props;
  let { onOpenChange = void 0 } = $$props;
  let { preventScroll = void 0 } = $$props;
  let { arrowSize = void 0 } = $$props;
  let { positioning = void 0 } = $$props;
  let { loop = void 0 } = $$props;
  let { dir = void 0 } = $$props;
  let { typeahead = void 0 } = $$props;
  let { closeFocus = void 0 } = $$props;
  let { disableFocusFirstItem = void 0 } = $$props;
  const { states: { open: localOpen }, updateOption, ids } = setCtx$3({
    closeOnOutsideClick,
    closeOnEscape,
    portal,
    forceVisible,
    defaultOpen: open,
    preventScroll,
    arrowSize,
    positioning,
    loop,
    dir,
    typeahead,
    closeFocus,
    disableFocusFirstItem,
    onOpenChange: ({ next }) => {
      if (open !== next) {
        onOpenChange?.(next);
        open = next;
      }
      return next;
    }
  });
  const idValues = derived([ids.menu, ids.trigger], ([$menuId, $triggerId]) => ({ menu: $menuId, trigger: $triggerId }));
  $$unsubscribe_idValues = subscribe(idValues, (value) => $idValues = value);
  if ($$props.closeOnOutsideClick === void 0 && $$bindings.closeOnOutsideClick && closeOnOutsideClick !== void 0)
    $$bindings.closeOnOutsideClick(closeOnOutsideClick);
  if ($$props.closeOnEscape === void 0 && $$bindings.closeOnEscape && closeOnEscape !== void 0)
    $$bindings.closeOnEscape(closeOnEscape);
  if ($$props.portal === void 0 && $$bindings.portal && portal !== void 0)
    $$bindings.portal(portal);
  if ($$props.forceVisible === void 0 && $$bindings.forceVisible && forceVisible !== void 0)
    $$bindings.forceVisible(forceVisible);
  if ($$props.open === void 0 && $$bindings.open && open !== void 0)
    $$bindings.open(open);
  if ($$props.onOpenChange === void 0 && $$bindings.onOpenChange && onOpenChange !== void 0)
    $$bindings.onOpenChange(onOpenChange);
  if ($$props.preventScroll === void 0 && $$bindings.preventScroll && preventScroll !== void 0)
    $$bindings.preventScroll(preventScroll);
  if ($$props.arrowSize === void 0 && $$bindings.arrowSize && arrowSize !== void 0)
    $$bindings.arrowSize(arrowSize);
  if ($$props.positioning === void 0 && $$bindings.positioning && positioning !== void 0)
    $$bindings.positioning(positioning);
  if ($$props.loop === void 0 && $$bindings.loop && loop !== void 0)
    $$bindings.loop(loop);
  if ($$props.dir === void 0 && $$bindings.dir && dir !== void 0)
    $$bindings.dir(dir);
  if ($$props.typeahead === void 0 && $$bindings.typeahead && typeahead !== void 0)
    $$bindings.typeahead(typeahead);
  if ($$props.closeFocus === void 0 && $$bindings.closeFocus && closeFocus !== void 0)
    $$bindings.closeFocus(closeFocus);
  if ($$props.disableFocusFirstItem === void 0 && $$bindings.disableFocusFirstItem && disableFocusFirstItem !== void 0)
    $$bindings.disableFocusFirstItem(disableFocusFirstItem);
  open !== void 0 && localOpen.set(open);
  {
    updateOption("closeOnOutsideClick", closeOnOutsideClick);
  }
  {
    updateOption("closeOnEscape", closeOnEscape);
  }
  {
    updateOption("portal", portal);
  }
  {
    updateOption("forceVisible", forceVisible);
  }
  {
    updateOption("preventScroll", preventScroll);
  }
  {
    updateOption("arrowSize", arrowSize);
  }
  {
    updateOption("positioning", positioning);
  }
  {
    updateOption("loop", loop);
  }
  {
    updateOption("dir", dir);
  }
  {
    updateOption("closeFocus", closeFocus);
  }
  {
    updateOption("disableFocusFirstItem", disableFocusFirstItem);
  }
  {
    updateOption("typeahead", typeahead);
  }
  $$unsubscribe_idValues();
  return `${slots.default ? slots.default({ ids: $idValues }) : ``}`;
});
const DropdownMenuItem = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let builder;
  let attrs;
  let $$restProps = compute_rest_props($$props, ["href", "asChild", "disabled"]);
  let $item, $$unsubscribe_item;
  let { href = void 0 } = $$props;
  let { asChild = false } = $$props;
  let { disabled = false } = $$props;
  const { elements: { item } } = getCtx$2();
  $$unsubscribe_item = subscribe(item, (value) => $item = value);
  createDispatcher();
  if ($$props.href === void 0 && $$bindings.href && href !== void 0)
    $$bindings.href(href);
  if ($$props.asChild === void 0 && $$bindings.asChild && asChild !== void 0)
    $$bindings.asChild(asChild);
  if ($$props.disabled === void 0 && $$bindings.disabled && disabled !== void 0)
    $$bindings.disabled(disabled);
  builder = $item;
  attrs = {
    ...getAttrs$4("item"),
    ...disabledAttrs(disabled)
  };
  $$unsubscribe_item();
  return `${asChild ? `${slots.default ? slots.default({ builder, attrs }) : ``}` : `${((tag) => {
    return tag ? `<${href ? "a" : "div"}${spread(
      [
        { href: escape_attribute_value(href) },
        escape_object(builder),
        escape_object($$restProps),
        escape_object(attrs)
      ],
      {}
    )}>${is_void(tag) ? "" : `${slots.default ? slots.default({ builder, attrs }) : ``}`}${is_void(tag) ? "" : `</${tag}>`}` : "";
  })(href ? "a" : "div")}`}`;
});
const DropdownMenuGroup = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let builder;
  let $$restProps = compute_rest_props($$props, ["asChild"]);
  let $group, $$unsubscribe_group;
  let { asChild = false } = $$props;
  const { group, id } = setGroupCtx();
  $$unsubscribe_group = subscribe(group, (value) => $group = value);
  const attrs = getAttrs$4("group");
  if ($$props.asChild === void 0 && $$bindings.asChild && asChild !== void 0)
    $$bindings.asChild(asChild);
  builder = $group(id);
  $$unsubscribe_group();
  return `${asChild ? `${slots.default ? slots.default({ builder, attrs }) : ``}` : `<div${spread([escape_object(builder), escape_object($$restProps), escape_object(attrs)], {})}>${slots.default ? slots.default({ builder, attrs }) : ``}</div>`}`;
});
const DropdownMenuContent = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let builder;
  let $$restProps = compute_rest_props($$props, [
    "sideOffset",
    "transition",
    "transitionConfig",
    "inTransition",
    "inTransitionConfig",
    "outTransition",
    "outTransitionConfig",
    "asChild",
    "id"
  ]);
  let $menu, $$unsubscribe_menu;
  let $open, $$unsubscribe_open;
  let { sideOffset = 5 } = $$props;
  let { transition = void 0 } = $$props;
  let { transitionConfig = void 0 } = $$props;
  let { inTransition = void 0 } = $$props;
  let { inTransitionConfig = void 0 } = $$props;
  let { outTransition = void 0 } = $$props;
  let { outTransitionConfig = void 0 } = $$props;
  let { asChild = false } = $$props;
  let { id = void 0 } = $$props;
  const { elements: { menu }, states: { open }, ids } = getContent(sideOffset);
  $$unsubscribe_menu = subscribe(menu, (value) => $menu = value);
  $$unsubscribe_open = subscribe(open, (value) => $open = value);
  const attrs = getAttrs$4("content");
  createDispatcher();
  if ($$props.sideOffset === void 0 && $$bindings.sideOffset && sideOffset !== void 0)
    $$bindings.sideOffset(sideOffset);
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
      ids.menu.set(id);
    }
  }
  builder = $menu;
  $$unsubscribe_menu();
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
const DropdownMenuTrigger = create_ssr_component(($$result, $$props, $$bindings, slots) => {
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
const Menu = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  const iconNode = [
    [
      "line",
      {
        "x1": "4",
        "x2": "20",
        "y1": "12",
        "y2": "12"
      }
    ],
    [
      "line",
      {
        "x1": "4",
        "x2": "20",
        "y1": "6",
        "y2": "6"
      }
    ],
    [
      "line",
      {
        "x1": "4",
        "x2": "20",
        "y1": "18",
        "y2": "18"
      }
    ]
  ];
  return `${validate_component(Icon$1, "Icon").$$render($$result, Object.assign({}, { name: "menu" }, $$props, { iconNode }), {}, {
    default: () => {
      return `${slots.default ? slots.default({}) : ``}`;
    }
  })}`;
});
const Menu$1 = Menu;
const Dropdown_menu_item = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["class", "inset"]);
  let { class: className = void 0 } = $$props;
  let { inset = void 0 } = $$props;
  if ($$props.class === void 0 && $$bindings.class && className !== void 0)
    $$bindings.class(className);
  if ($$props.inset === void 0 && $$bindings.inset && inset !== void 0)
    $$bindings.inset(inset);
  return `${validate_component(DropdownMenuItem, "DropdownMenuPrimitive.Item").$$render(
    $$result,
    Object.assign(
      {},
      {
        class: cn("relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", inset && "pl-8", className)
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
const Dropdown_menu_content = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["class", "sideOffset", "transition", "transitionConfig"]);
  let { class: className = void 0 } = $$props;
  let { sideOffset = 4 } = $$props;
  let { transition = flyAndScale } = $$props;
  let { transitionConfig = void 0 } = $$props;
  if ($$props.class === void 0 && $$bindings.class && className !== void 0)
    $$bindings.class(className);
  if ($$props.sideOffset === void 0 && $$bindings.sideOffset && sideOffset !== void 0)
    $$bindings.sideOffset(sideOffset);
  if ($$props.transition === void 0 && $$bindings.transition && transition !== void 0)
    $$bindings.transition(transition);
  if ($$props.transitionConfig === void 0 && $$bindings.transitionConfig && transitionConfig !== void 0)
    $$bindings.transitionConfig(transitionConfig);
  return `${validate_component(DropdownMenuContent, "DropdownMenuPrimitive.Content").$$render(
    $$result,
    Object.assign(
      {},
      { transition },
      { transitionConfig },
      { sideOffset },
      {
        class: cn("z-50 min-w-[8rem] rounded-md border bg-popover p-1 text-popover-foreground shadow-md focus:outline-none", className)
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
const Root = DropdownMenu;
const Trigger = DropdownMenuTrigger;
const Group = DropdownMenuGroup;
const Nav = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { data } = $$props;
  if ($$props.data === void 0 && $$bindings.data && data !== void 0)
    $$bindings.data(data);
  return `<div class="one"></div> <nav class="relative z-50 h-14"><div class="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4"><a${add_attribute("href", data.site.home ? data.site.home : "/", 0)} class="flex items-center space-x-3 blurry-bg">${data.site.logo ? `<img${add_attribute("src", data.site.logo, 0)} class="h-8"${add_attribute("alt", data.site.title, 0)} srcset="">` : ``} ${data.site.title ? `<span class="self-center font-semibold whitespace-nowrap">${escape(data.site.title)}</span>` : ``}</a> ${validate_component(Button, "Button").$$render(
    $$result,
    {
      variant: "outline",
      size: "icon",
      class: "inline-flex items-center p-2 w-10 h-10 justify-center text-sm rounded-lg md:hidden focus:outline-none",
      id: "ham-btn"
    },
    {},
    {
      default: () => {
        return `${validate_component(Menu$1, "Menu").$$render($$result, { className: "h-4 w-4" }, {}, {})}`;
      }
    }
  )} <div class="hidden w-full md:block md:w-auto" id="navbar-default"><ul class="font-medium md:relative md:bg-transparent absolute w-full left-[0px] flex flex-col p-1 md:p-0 mt-4 border-solid border border-secondary bg-card text-card-foreground md:flex-row md:space-x-1 md:mt-0 md:border-0">${each(data.site.nav, (navItem) => {
    return `<li><a${add_attribute("href", navItem.url, 0)} rel="external">${validate_component(Button, "Button").$$render($$result, { variant: "link" }, {}, {
      default: () => {
        return `${escape(navItem.name)}`;
      }
    })}</a> </li>`;
  })} <li>${validate_component(Root, "DropdownMenu.Root").$$render($$result, {}, {}, {
    default: () => {
      return `${validate_component(Trigger, "DropdownMenu.Trigger").$$render($$result, { asChild: true }, {}, {
        default: ({ builder }) => {
          return `${validate_component(Button, "Button").$$render($$result, { builders: [builder], variant: "link" }, {}, {
            default: () => {
              return `Categories`;
            }
          })}`;
        }
      })} ${validate_component(Dropdown_menu_content, "DropdownMenu.Content").$$render($$result, { class: "w-56" }, {}, {
        default: () => {
          return `${validate_component(Group, "DropdownMenu.Group").$$render($$result, {}, {}, {
            default: () => {
              return `<a rel="external" href="/">${validate_component(Dropdown_menu_item, "DropdownMenu.Item").$$render($$result, { class: "font-medium" }, {}, {
                default: () => {
                  return `Home`;
                }
              })}</a>`;
            }
          })} ${validate_component(Group, "DropdownMenu.Group").$$render($$result, {}, {}, {
            default: () => {
              return `${data.site.categories ? `${each(data.site.categories, (category) => {
                return `<a rel="external" href="${"/category-" + escape(category.name, true)}">${validate_component(Dropdown_menu_item, "DropdownMenu.Item").$$render($$result, { class: "font-medium" }, {}, {
                  default: () => {
                    return `${escape(category.name)}`;
                  }
                })} </a>`;
              })}` : ``}`;
            }
          })}`;
        }
      })}`;
    }
  })}</li></ul></div></div></nav>`;
});
const Layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { data } = $$props;
  if ($$props.data === void 0 && $$bindings.data && data !== void 0)
    $$bindings.data(data);
  return `${data.showNav ? `${validate_component(Nav, "Nav").$$render($$result, { data }, {}, {})}` : ``} ${$$result.head += `<!-- HEAD_svelte-xs6o1m_START -->${$$result.title = `<title>${escape(data.site.title)}</title>`, ""}${each(Object.entries(data.site.metaTags), ([key, value]) => {
    return `<meta${add_attribute("name", key, 0)}${add_attribute("content", value, 0)}>`;
  })}<!-- HEAD_svelte-xs6o1m_END -->`, ""} ${slots.default ? slots.default({}) : ``}`;
});

export { Layout as default };
//# sourceMappingURL=_layout.svelte-68f2bf09.js.map
