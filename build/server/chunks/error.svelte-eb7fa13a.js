import { c as create_ssr_component, d as subscribe, e as escape } from './ssr-7290eec0.js';
import { p as page } from './stores-aeb5a931.js';

const Error = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $page, $$unsubscribe_page;
  $$unsubscribe_page = subscribe(page, (value) => $page = value);
  $$unsubscribe_page();
  return `<h1>${escape($page.status)}</h1> <p>${escape($page.error?.message)}</p>`;
});

export { Error as default };
//# sourceMappingURL=error.svelte-eb7fa13a.js.map
