import { c as create_ssr_component, a as each, e as escape, b as add_attribute } from './ssr-04a1ecec.js';
import Markdoc from '@markdoc/markdoc';

const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { data } = $$props;
  const ast = Markdoc.parse(data.md);
  const content = Markdoc.transform(ast);
  let html = Markdoc.renderers.html(content);
  let sideBar = [];
  if ($$props.data === void 0 && $$bindings.data && data !== void 0)
    $$bindings.data(data);
  return `<section class="mx-auto container rounded-3xl bg-white mt-32"><div class="grid grid-cols-5 gap-4"><div class="col-span-5 md:col-span-1 hidden md:block border-r-2 border-gray-500"><ul class="w-full text-sm font-medium text-gray-900 bg-white mt-8 rounded-lg">${each(sideBar, (item) => {
    return `<li class="w-full px-4 py-2"><a href="${"#" + escape(item.id, true)}"${add_attribute("class", item.type == "h2" ? "pl-5" : "", 0)}>${escape(item.text)}</a> </li>`;
  })} <li class="w-full px-4 py-2 rounded-b-lg" data-svelte-h="svelte-1fk2cyx">Download</li></ul></div> <div class="col-span-5 md:col-span-4"><div class="bg-white pt-6 p-0 md:p-10"><article id="markdown" class="prose prose-stone max-w-none prose-code:bg-gray-200 prose-code:px-[0.3rem] prose-code:py-[0.2rem] prose-code:font-mono prose-code:text-sm prose-code:rounded"><!-- HTML_TAG_START -->${html}<!-- HTML_TAG_END --></article></div></div></div></section>`;
});

export { Page as default };
//# sourceMappingURL=_page.svelte-23471404.js.map
