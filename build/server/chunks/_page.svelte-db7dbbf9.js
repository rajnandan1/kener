import { c as create_ssr_component, v as validate_component, a as each, e as escape, b as add_attribute } from './ssr-c85d451a.js';
import Markdoc from '@markdoc/markdoc';
import { C as Card, a as Card_content } from './card-content-512872f2.js';
import 'clsx';
import 'tailwind-merge';

const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { data } = $$props;
  const ast = Markdoc.parse(data.md);
  const content = Markdoc.transform(ast);
  let html = Markdoc.renderers.html(content);
  let sideBar = [];
  if ($$props.data === void 0 && $$bindings.data && data !== void 0)
    $$bindings.data(data);
  return `<section class="mx-auto container rounded-3xl mt-8">${validate_component(Card, "Card.Root").$$render($$result, {}, {}, {
    default: () => {
      return `${validate_component(Card_content, "Card.Content").$$render($$result, {}, {}, {
        default: () => {
          return `<div class="grid grid-cols-5 gap-4"><div class="col-span-5 md:col-span-1 pt-2 hidden md:block border-r-2 border-secondary"><ul class="w-full text-sm font-medium sticky top-0 overflow-y-auto max-h-screen">${each(sideBar, (item) => {
            return `<li class="w-full py-2"><a href="${"#" + escape(item.id, true)}"${add_attribute("class", item.type == "h2" ? "pl-5" : "", 0)}>${escape(item.text)}</a> </li>`;
          })}</ul></div> <div class="col-span-5 md:col-span-4"><div class="pt-6 p-0 md:p-10"><article id="markdown" class="prose prose-stone max-w-none dark:prose-invert dark:prose-pre:bg-neutral-900 prose-code:px-[0.3rem] dark:prose-code:bg-yellow-100 dark:prose-code:text-primary-foreground prose-code:py-[0.2rem] prose-code:font-normal prose-code:font-mono prose-code:text-sm prose-code:rounded"><!-- HTML_TAG_START -->${html}<!-- HTML_TAG_END --></article></div></div></div>`;
        }
      })}`;
    }
  })}</section>`;
});

export { Page as default };
//# sourceMappingURL=_page.svelte-db7dbbf9.js.map
