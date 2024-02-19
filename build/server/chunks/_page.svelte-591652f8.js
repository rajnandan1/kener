import { c as create_ssr_component, b as add_attribute, e as escape, v as validate_component, a as each } from './ssr-f056b9d4.js';
import { M as Monitor } from './monitor-a370446f.js';
import { C as Card, a as Card_content } from './Icon-2d61886b.js';
import { I as Incident, C as Card_header, a as Card_title, b as Card_description } from './incident-2dcbb3c6.js';
import 'clsx';
import { b as buttonVariants } from './index3-940e7b25.js';
import { B as Badge } from './index4-9cd90a9b.js';
import './ctx-719e1af3.js';
import './index2-ef0fcb8d.js';
import './events-3e3c01b3.js';
import 'tailwind-merge';
import './helpers-0acb6e43.js';
import 'moment';
import './chevron-down-afdb97a6.js';
import 'tailwind-variants';

const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { data } = $$props;
  let hasActiveIncidents = data.openIncidents.length > 0;
  if ($$props.data === void 0 && $$bindings.data && data !== void 0)
    $$bindings.data(data);
  return `<div class="mt-32"></div> ${data.site.hero ? `<section class="mx-auto mb-8 flex w-full max-w-4xl flex-1 flex-col items-start justify-center"><div class="mx-auto max-w-screen-xl px-4 lg:flex lg:items-center"><div class="blurry-bg mx-auto max-w-3xl text-center">${data.site.hero.image ? `<img${add_attribute("src", data.site.hero.image, 0)} class="m-auto h-16 w-16" alt="" srcset="">` : ``} ${data.site.hero.title ? `<h1 class="bg-gradient-to-r from-green-300 via-blue-500 to-purple-600 bg-clip-text text-5xl font-extrabold leading-snug text-transparent">${escape(data.site.hero.title)}</h1>` : ``} ${data.site.hero.subtitle ? `<p class="mx-auto mt-4 max-w-xl sm:text-xl">${escape(data.site.hero.subtitle)}</p>` : ``}</div></div></section>` : ``} ${hasActiveIncidents ? `<section class="mx-auto mb-4 flex w-full max-w-[890px] flex-1 flex-col items-start justify-center bg-transparent" id=""><div class="grid w-full grid-cols-2 gap-4"><div class="col-span-2 text-center md:col-span-1 md:text-left">${validate_component(Badge, "Badge").$$render($$result, { variant: "outline" }, {}, {
    default: () => {
      return `Ongoing Incidents`;
    }
  })}</div></div></section> <section class="mx-auto mb-8 flex w-full max-w-[890px] flex-1 flex-col items-start justify-center backdrop-blur-[2px]" id="">${each(data.openIncidents, (incident, i) => {
    return `${validate_component(Incident, "Incident").$$render(
      $$result,
      {
        incident,
        state: "close",
        variant: "title+body+comments+monitor",
        monitor: incident.monitor
      },
      {},
      {}
    )}`;
  })}</section>` : ``} ${data.monitors.length > 0 ? `<section class="mx-auto mb-4 flex w-full max-w-[890px] flex-1 flex-col items-start justify-center bg-transparent" id=""><div class="grid w-full grid-cols-2 gap-4"><div class="col-span-2 text-center md:col-span-1 md:text-left">${validate_component(Badge, "Badge").$$render($$result, { class: "", variant: "outline" }, {}, {
    default: () => {
      return `Availability per Component`;
    }
  })}</div> <div class="col-span-2 text-center md:col-span-1 md:text-right">${validate_component(Badge, "Badge").$$render($$result, { variant: "outline" }, {}, {
    default: () => {
      return `<span class="bg-api-up mr-1 inline-flex h-[8px] w-[8px] rounded-full opacity-75"></span> <span class="mr-3" data-svelte-h="svelte-fd8nbr">UP</span> <span class="bg-api-degraded mr-1 inline-flex h-[8px] w-[8px] rounded-full opacity-75"></span> <span class="mr-3" data-svelte-h="svelte-ddctvm">DEGRADED</span> <span class="bg-api-down mr-1 inline-flex h-[8px] w-[8px] rounded-full opacity-75"></span> <span class="mr-3" data-svelte-h="svelte-1o75psw">DOWN</span>`;
    }
  })}</div></div></section> <section class="mx-auto mb-8 flex w-full max-w-[890px] flex-1 flex-col items-start justify-center backdrop-blur-[2px]">${validate_component(Card, "Card.Root").$$render($$result, {}, {}, {
    default: () => {
      return `${validate_component(Card_content, "Card.Content").$$render($$result, { class: "monitors-card p-0" }, {}, {
        default: () => {
          return `${each(data.monitors, (monitor) => {
            return `${validate_component(Monitor, "Monitor").$$render($$result, { monitor, localTz: data.localTz }, {}, {})}`;
          })}`;
        }
      })}`;
    }
  })}</section>` : ``} ${data.site.categories ? `<section class="mx-auto mb-8 w-full max-w-[890px] backdrop-blur-[2px]"><h2 class="mb-2 mt-2 px-2 text-xl font-semibold" data-svelte-h="svelte-3lfsa8">Other Monitors</h2> ${each(data.site.categories, (category) => {
    return `${validate_component(Card, "Card.Root").$$render($$result, { class: "mb-2 w-full" }, {}, {
      default: () => {
        return `${validate_component(Card_header, "Card.Header").$$render($$result, {}, {}, {
          default: () => {
            return `${validate_component(Card_title, "Card.Title").$$render($$result, {}, {}, {
              default: () => {
                return `${escape(category.name)}`;
              }
            })} ${validate_component(Card_description, "Card.Description").$$render($$result, { class: "relative pr-[100px]" }, {}, {
              default: () => {
                return `${category.description ? `${escape(category.description)}` : ``} <a href="${"/category-" + escape(category.name, true)}" class="${escape(buttonVariants({ variant: "secondary" }), true) + " absolute -top-4 right-2"}">View</a> `;
              }
            })} `;
          }
        })} `;
      }
    })}`;
  })}</section>` : ``}`;
});

export { Page as default };
//# sourceMappingURL=_page.svelte-591652f8.js.map
