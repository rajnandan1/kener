<script>
    import Markdoc from "@markdoc/markdoc";
    import { onMount } from "svelte";
    import * as Card from "$lib/components/ui/card";
    export let data;
    const ast = Markdoc.parse(data.md);
    const content = Markdoc.transform(ast);
    let html = Markdoc.renderers.html(content);
    let sideBar = [];
    onMount(async () => {
        const headings = document.querySelectorAll("#markdown h1");
        headings.forEach((heading) => {
            const id = "h1" + heading.textContent.replace(/[^a-z0-9]/gi, "-").toLowerCase();
            heading.id = id;
            heading.setAttribute("sider", "sidemenu");
            heading.setAttribute("sider-t", "h1");
            // heading.style.color = "#31304D";
        });

        const headings2 = document.querySelectorAll("#markdown h2");
        headings2.forEach((heading) => {
            const id = "h2" + heading.textContent.replace(/[^a-z0-9]/gi, "-").toLowerCase();
            heading.id = id;
            heading.setAttribute("sider", "sidemenu");
            heading.setAttribute("sider-t", "h2");
            // heading.style.color = "#435585";
        });

        const sidemenuHeadings = document.querySelectorAll("#markdown [sider='sidemenu']");
        sidemenuHeadings.forEach((heading) => {
            sideBar = [
                ...sideBar,
                {
                    id: heading.id,
                    text: heading.textContent,
                    type: heading.getAttribute("sider-t"),
                },
            ];
        });
    });
</script>
<section class="mx-auto container rounded-3xl mt-8">
    <Card.Root>
        <Card.Content>
            <div class="grid grid-cols-5 gap-4">
                <div class="col-span-5 md:col-span-1 pt-2 hidden md:block border-r-2 border-secondary">
                    <ul class="w-full text-sm font-medium sticky top-0 overflow-y-auto max-h-screen">
                        {#each sideBar as item}
                        <li class="w-full py-2">
                            <a href="#{item.id}" class="{item.type == 'h2'?'pl-5':''}">{item.text}</a>
                        </li>
                        {/each}
                    </ul>
                </div>
                <div class="col-span-5 md:col-span-4">
                    <div class="pt-6 p-0 md:p-10">
                        <article
                            id="markdown"
                            class="prose prose-stone max-w-none dark:prose-invert dark:prose-pre:bg-neutral-900 prose-code:px-[0.3rem] dark:prose-code:bg-yellow-100 dark:prose-code:text-primary-foreground prose-code:py-[0.2rem] prose-code:font-normal prose-code:font-mono prose-code:text-sm prose-code:rounded"
                        >
                            {@html html}
                        </article>
                    </div>
                </div>
            </div>
        </Card.Content>
    </Card.Root>
</section>
