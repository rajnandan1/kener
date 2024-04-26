import { c as create_ssr_component, f as subscribe, b as add_attribute, v as validate_component, a as each, e as escape } from './ssr-3edfa391.js';
import { M as Monitor } from './monitor-5e0b1df7.js';
import { C as Card, a as Card_content } from './card-content-6ec0cd90.js';
import 'clsx';
import './Icon-36e7f051.js';
import { l } from './client-7218de37.js';
import { p as page } from './stores-d0ec6658.js';
import './index2-c5c18f89.js';
import './events-b3d49719.js';
import './index3-c13390c6.js';
import 'tailwind-variants';
import 'tailwind-merge';

const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$unsubscribe_page;
  $$unsubscribe_page = subscribe(page, (value) => value);
  let element;
  let { data } = $$props;
  if ($$props.data === void 0 && $$bindings.data && data !== void 0)
    $$bindings.data(data);
  $$unsubscribe_page();
  return `${data.monitors.length > 0 ? `<section class="w-fit p-0"${add_attribute("this", element, 0)}>${validate_component(Card, "Card.Root").$$render($$result, { class: "w-[580px] border-0 shadow-none" }, {}, {
    default: () => {
      return `${validate_component(Card_content, "Card.Content").$$render($$result, { class: "p-0 monitors-card " }, {}, {
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
          return `<h1 class="scroll-m-20 text-2xl font-extrabold tracking-tight lg:text-2xl text-center" data-svelte-h="svelte-1vwlrnd">No Monitor Found.</h1> <p class="mt-3 text-center">${escape(l(data.lang, "root.read_doc_monitor"))} <a href="https://kener.ing/docs#h1add-monitors" target="_blank" class="underline">${escape(l(data.lang, "root.here"))}</a></p>`;
        }
      })}`;
    }
  })}</section>`}`;
});

export { Page as default };
//# sourceMappingURL=_page.svelte-3a830046.js.map
