import { c as create_ssr_component, e as escape, v as validate_component, a as each } from './ssr-3edfa391.js';
import { M as Monitor } from './monitor-5e0b1df7.js';
import { C as Card, a as Card_content } from './card-content-6ec0cd90.js';
import 'clsx';
import { I as Incident } from './incident-1b62c429.js';
import './Icon-36e7f051.js';
import { l, B as Badge } from './client-7218de37.js';
import './index2-c5c18f89.js';
import './events-b3d49719.js';
import './index3-c13390c6.js';
import 'tailwind-variants';
import './helpers-0acb6e43.js';
import 'moment';
import './chevron-down-10a1d022.js';
import 'tailwind-merge';

const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { data } = $$props;
  let hasActiveIncidents = data.openIncidents.length > 0;
  if ($$props.data === void 0 && $$bindings.data && data !== void 0)
    $$bindings.data(data);
  return `${$$result.head += `<!-- HEAD_svelte-11ekmvk_START -->${data.monitors.length > 0 ? `${$$result.title = `<title>${escape(data.monitors[0].name)} Monitor Page</title>`, ""}` : ``}<!-- HEAD_svelte-11ekmvk_END -->`, ""} <div class="mt-32"></div> ${hasActiveIncidents ? `<section class="mx-auto bg-transparent mb-4 flex w-full max-w-[890px] flex-1 flex-col items-start justify-center" id=""><div class="grid w-full grid-cols-2 gap-4"><div class="col-span-2 md:col-span-1 text-center md:text-left">${validate_component(Badge, "Badge").$$render($$result, { variant: "outline" }, {}, {
    default: () => {
      return `${escape(l(data.lang, "root.ongoing_incidents"))}`;
    }
  })}</div></div></section> <section class="mx-auto mb-8 flex w-full max-w-[890px] flex-1 flex-col items-start justify-center" id="">${each(data.openIncidents, (incident, i) => {
    return `${validate_component(Incident, "Incident").$$render(
      $$result,
      {
        incident,
        state: "close",
        variant: "title+body+comments+monitor",
        monitor: incident.monitor,
        lang: data.lang
      },
      {},
      {}
    )}`;
  })}</section>` : ``} ${data.monitors.length > 0 ? `<section class="mx-auto bg-transparent mb-4 flex w-full max-w-[890px] flex-1 flex-col items-start justify-center" id=""><div class="grid w-full grid-cols-2 gap-4"><div class="col-span-2 md:col-span-1 text-center md:text-left">${validate_component(Badge, "Badge").$$render($$result, { class: "", variant: "outline" }, {}, {
    default: () => {
      return `${escape(l(data.lang, "root.availability_per_component"))}`;
    }
  })}</div> <div class="col-span-2 md:col-span-1 text-center md:text-right">${validate_component(Badge, "Badge").$$render($$result, { variant: "outline" }, {}, {
    default: () => {
      return `<span class="w-[8px] h-[8px] inline-flex rounded-full bg-api-up opacity-75 mr-1"></span> <span class="mr-3">${escape(l(data.lang, "statuses.UP"))}</span> <span class="w-[8px] h-[8px] inline-flex rounded-full bg-api-degraded opacity-75 mr-1"></span> <span class="mr-3">${escape(l(data.lang, "statuses.DEGRADED"))}</span> <span class="w-[8px] h-[8px] inline-flex rounded-full bg-api-down opacity-75 mr-1"></span> <span class="mr-3">${escape(l(data.lang, "statuses.DOWN"))}</span>`;
    }
  })}</div></div></section> <section class="mx-auto backdrop-blur-[2px] mb-8 flex w-full max-w-[890px] flex-1 flex-col items-start justify-center">${validate_component(Card, "Card.Root").$$render($$result, { class: "w-full" }, {}, {
    default: () => {
      return `${validate_component(Card_content, "Card.Content").$$render($$result, { class: "p-0 monitors-card" }, {}, {
        default: () => {
          return `${each(data.monitors, (monitor) => {
            return `${validate_component(Monitor, "Monitor").$$render(
              $$result,
              {
                monitor,
                localTz: data.localTz,
                lang: data.lang
              },
              {},
              {}
            )}`;
          })}`;
        }
      })}`;
    }
  })}</section>` : `<section class="mx-auto bg-transparent mb-4 flex w-full max-w-[890px] flex-1 flex-col items-start justify-center" id="">${validate_component(Card, "Card.Root").$$render($$result, { class: "mx-auto" }, {}, {
    default: () => {
      return `${validate_component(Card_content, "Card.Content").$$render($$result, { class: "pt-4" }, {}, {
        default: () => {
          return `<h1 class="scroll-m-20 text-2xl font-extrabold tracking-tight lg:text-2xl text-center">${escape(l(data.lang, "root.no_monitors"))}</h1> <p class="mt-3 text-center">${escape(l(data.lang, "root.read_doc_monitor"))} <a href="https://kener.ing/docs#h1add-monitors" target="_blank" class="underline">${escape(l(data.lang, "root.here"))}</a></p>`;
        }
      })}`;
    }
  })}</section>`}`;
});

export { Page as default };
//# sourceMappingURL=_page.svelte-ce6dfce4.js.map
