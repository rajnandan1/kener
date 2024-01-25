import { c as create_ssr_component, b as add_attribute, e as escape, v as validate_component, a as each } from './ssr-f056b9d4.js';
import { M as Monitor } from './monitor-a4f7155d.js';
import { C as Card, a as Card_content } from './Icon-c4d21504.js';
import { I as Incident, C as Card_header, a as Card_title, b as Card_description } from './incident-7de6acde.js';
import 'clsx';
import { b as buttonVariants } from './index3-57e8b665.js';
import './ctx-a5738360.js';
import { B as Badge } from './index4-56229f86.js';
import './index2-ef0fcb8d.js';
import 'tailwind-merge';
import './helpers-1d8653cf.js';
import 'moment';
import './chevron-down-77916ef7.js';
import 'tailwind-variants';

const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { data } = $$props;
  let hasActiveIncidents = false;
  for (let i = 0; i < data.monitors.length; i++) {
    if (data.monitors[i].activeIncidents.length > 0) {
      hasActiveIncidents = true;
      break;
    }
  }
  if ($$props.data === void 0 && $$bindings.data && data !== void 0)
    $$bindings.data(data);
  return `<div class="mt-32"></div> ${data.site.hero ? `<section class="mx-auto flex w-full max-w-4xl mb-8 flex-1 flex-col items-start justify-center"><div class="mx-auto max-w-screen-xl px-4 lg:flex lg:items-center"><div class="mx-auto max-w-3xl text-center blurry-bg">${data.site.hero.image ? `<img${add_attribute("src", data.site.hero.image, 0)} class="h-16 w-16 m-auto" alt="" srcset="">` : ``} ${data.site.hero.title ? `<h1 class="bg-gradient-to-r from-green-300 via-blue-500 to-purple-600 bg-clip-text text-5xl font-extrabold text-transparent leading-snug">${escape(data.site.hero.title)}</h1>` : ``} ${data.site.hero.subtitle ? `<p class="mx-auto mt-4 max-w-xl sm:text-xl">${escape(data.site.hero.subtitle)}</p>` : ``}</div></div></section>` : ``} ${hasActiveIncidents ? `<section class="mx-auto bg-transparent mb-4 flex w-full max-w-[890px] flex-1 flex-col items-start justify-center" id=""><div class="grid w-full grid-cols-2 gap-4"><div class="col-span-2 md:col-span-1 text-center md:text-left">${validate_component(Badge, "Badge").$$render($$result, { variant: "outline" }, {}, {
    default: () => {
      return `Ongoing Incidents`;
    }
  })}</div></div></section> <section class="mx-auto backdrop-blur-[2px] mb-8 flex w-full max-w-[890px] flex-1 flex-col items-start justify-center" id="">${each(data.monitors, (monitor) => {
    return `${each(monitor.activeIncidents, (incident, i) => {
      return `${validate_component(Incident, "Incident").$$render(
        $$result,
        {
          incident,
          state: "close",
          variant: "title+body+comments+monitor",
          monitor
        },
        {},
        {}
      )}`;
    })}`;
  })}</section>` : ``} ${data.monitors.length > 0 ? `<section class="mx-auto bg-transparent mb-4 flex w-full max-w-[890px] flex-1 flex-col items-start justify-center" id=""><div class="grid w-full grid-cols-2 gap-4"><div class="col-span-2 md:col-span-1 text-center md:text-left">${validate_component(Badge, "Badge").$$render($$result, { class: "", variant: "outline" }, {}, {
    default: () => {
      return `Availability per Component`;
    }
  })}</div> <div class="col-span-2 md:col-span-1 text-center md:text-right">${validate_component(Badge, "Badge").$$render($$result, { variant: "outline" }, {}, {
    default: () => {
      return `<span class="w-[8px] h-[8px] inline-flex rounded-full bg-api-up opacity-75 mr-1"></span> <span class="mr-3" data-svelte-h="svelte-fd8nbr">UP</span> <span class="w-[8px] h-[8px] inline-flex rounded-full bg-api-degraded opacity-75 mr-1"></span> <span class="mr-3" data-svelte-h="svelte-ddctvm">DEGRADED</span> <span class="w-[8px] h-[8px] inline-flex rounded-full bg-api-down opacity-75 mr-1"></span> <span class="mr-3" data-svelte-h="svelte-1o75psw">DOWN</span>`;
    }
  })}</div></div></section> <section class="mx-auto backdrop-blur-[2px] mb-8 flex w-full max-w-[890px] flex-1 flex-col items-start justify-center">${validate_component(Card, "Card.Root").$$render($$result, {}, {}, {
    default: () => {
      return `${validate_component(Card_content, "Card.Content").$$render($$result, { class: "p-0 monitors-card" }, {}, {
        default: () => {
          return `${each(data.monitors, (monitor) => {
            return `${validate_component(Monitor, "Monitor").$$render($$result, { monitor, localTz: data.localTz }, {}, {})}`;
          })}`;
        }
      })}`;
    }
  })}</section>` : ``} ${data.site.categories ? `<section class="mx-auto backdrop-blur-[2px] mb-8 w-full max-w-[890px]"><h2 class="text-xl px-2 mb-2 mt-2 font-semibold" data-svelte-h="svelte-1gwq6ub">Other Monitors</h2> ${each(data.site.categories, (category) => {
    return `${validate_component(Card, "Card.Root").$$render($$result, { class: "w-full mb-2" }, {}, {
      default: () => {
        return `${validate_component(Card_header, "Card.Header").$$render($$result, {}, {}, {
          default: () => {
            return `${validate_component(Card_title, "Card.Title").$$render($$result, {}, {}, {
              default: () => {
                return `${escape(category.name)}`;
              }
            })} ${validate_component(Card_description, "Card.Description").$$render($$result, { class: "relative pr-[100px]" }, {}, {
              default: () => {
                return `${category.description ? `${escape(category.description)}` : ``} <a href="${"/category-" + escape(category.name, true)}" class="${escape(buttonVariants({ variant: "secondary" }), true) + " absolute right-2 -top-4"}">View</a> `;
              }
            })} `;
          }
        })} `;
      }
    })}`;
  })}</section>` : ``}`;
});

export { Page as default };
//# sourceMappingURL=_page.svelte-9ff016ab.js.map
