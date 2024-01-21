import { c as create_ssr_component, v as validate_component, a as each } from './ssr-3edfa391.js';
import { M as Monitor } from './monitor-e7711faf.js';
import { C as Card, a as Card_content } from './card-content-7a973783.js';
import 'clsx';
import { I as Incident } from './incident-2c9cee56.js';
import './Icon-8f6a4a04.js';
import { B as Badge } from './index4-b36fddc1.js';
import './index3-f40f43ed.js';
import 'tailwind-variants';
import './helpers-1d8653cf.js';
import 'moment';
import './chevron-down-abad86ac.js';
import './index2-c5c18f89.js';
import 'tailwind-merge';

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
  return `<div class="mt-32"></div> ${hasActiveIncidents ? `<section class="mx-auto bg-transparent mb-4 flex w-full max-w-[890px] flex-1 flex-col items-start justify-center" id=""><div class="grid w-full grid-cols-2 gap-4"><div class="col-span-2 md:col-span-1 text-center md:text-left">${validate_component(Badge, "Badge").$$render($$result, { variant: "outline" }, {}, {
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
  })}</div></div></section> <section class="mx-auto backdrop-blur-[2px] mb-8 flex w-full max-w-[890px] flex-1 flex-col items-start justify-center">${validate_component(Card, "Card.Root").$$render($$result, { class: "w-full" }, {}, {
    default: () => {
      return `${validate_component(Card_content, "Card.Content").$$render($$result, { class: "p-0 monitors-card" }, {}, {
        default: () => {
          return `${each(data.monitors, (monitor) => {
            return `${validate_component(Monitor, "Monitor").$$render($$result, { monitor, localTz: data.localTz }, {}, {})}`;
          })}`;
        }
      })}`;
    }
  })}</section>` : `<section class="mx-auto bg-transparent mb-4 flex w-full max-w-[890px] flex-1 flex-col items-start justify-center" id="">${validate_component(Card, "Card.Root").$$render($$result, { class: "mx-auto" }, {}, {
    default: () => {
      return `${validate_component(Card_content, "Card.Content").$$render($$result, { class: "pt-4" }, {}, {
        default: () => {
          return `<h1 class="scroll-m-20 text-2xl font-extrabold tracking-tight lg:text-2xl text-center" data-svelte-h="svelte-pnpgii">No Monitor Found.</h1> <p class="mt-3 text-center" data-svelte-h="svelte-x3h5nn">Please read the documentation on how to add monitors 
				<a href="https://kener.ing/docs#h1add-monitors" target="_blank" class="underline">here</a>.</p>`;
        }
      })}`;
    }
  })}</section>`}`;
});

export { Page as default };
//# sourceMappingURL=_page.svelte-073e2dc3.js.map
