<script>
  import { onMount } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import ArrowLeft from "lucide-svelte/icons/arrow-left";
  import ArrowRight from "lucide-svelte/icons/arrow-right";

  import { afterNavigate } from "$app/navigation";
  export let data;
  let subHeadings = [];
  let previousH2 = null;

  function fillSubHeadings() {
    subHeadings = [];
    const headings = document.querySelectorAll("#markdown h2, #markdown h3");
    headings.forEach((heading) => {
      let id = heading.textContent.replace(/[^a-z0-9]/gi, "-").toLowerCase();
      if (heading.tagName === "H2") {
        previousH2 = id;
      } else {
        id = `${previousH2}-${id}`;
      }
      heading.id = id;
      subHeadings.push({
        id,
        text: heading.textContent,
        level: heading.tagName === "H2" ? 2 : 3
      });
    });
  }

  let nextPath;
  let previousPath;

  function scrollToId(id) {
    const element = document.getElementById(id);
    if (element) {
      const y = element.getBoundingClientRect().top + window.pageYOffset - 100;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  }

  //function to iterate all h1,h2 nd h3 and add a button inside them
  function addCopyButton() {
    const headings = document.querySelectorAll("#markdown h1, #markdown h2, #markdown h3");
    headings.forEach((heading) => {
      const button = document.createElement("button");
      button.classList.add("copybtn");
      button.classList.add("relative");
      button.innerHTML = `<svg class="copy-btn left-0 top-0 absolute" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#777" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-link"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
				<svg class="check-btn absolute left-0 top-0" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="green" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg>`;
      button.style = "margin-left: 10px;height:16px;width:16px background-color: transparent; cursor: pointer;";
      button.onclick = () => {
        navigator.clipboard.writeText(`https://kener.ing/docs${data.docFilePath.split(".md")[0]}#` + heading.id);
      };
      heading.appendChild(button);
    });
  }

  function handleRightBarClick(e) {
    if (e.target.tagName === "A" && e.target.classList.contains("rlink")) {
      e.preventDefault();
      const id = e.target.getAttribute("href").slice(1);
      scrollToId(id);
    }
  }

  //function to find next and previous path
  function findNextAndPreviousPath() {
    let structure = data.siteStructure.sidebar;

    // Flatten the structure - combine all children arrays into one
    const flattenedPages = [];

    for (let i = 0; i < structure.length; i++) {
      const section = structure[i];
      if (section.children && Array.isArray(section.children)) {
        flattenedPages.push(...section.children);
      }
    }

    // Find current page index in the flattened array
    const currentIndex = flattenedPages.findIndex((page) => page.file === data.docFilePath);

    // Set previous and next paths if they exist
    if (currentIndex > 0) {
      previousPath = flattenedPages[currentIndex - 1];
    }

    if (currentIndex < flattenedPages.length - 1) {
      nextPath = flattenedPages[currentIndex + 1];
    }
  }

  afterNavigate(() => {
    document.dispatchEvent(
      new CustomEvent("pagechange", {
        bubbles: true,
        detail: {
          docFilePath: data.docFilePath
        }
      })
    );
    fillSubHeadings();
    document.dispatchEvent(
      new CustomEvent("rightbar", {
        bubbles: true,
        detail: {
          rightbar: subHeadings
        }
      })
    );
    hljs.highlightAll();
    //if hash present scroll to hash
    if (location.hash) {
      scrollToId(location.hash.slice(1));
    }
    //if hash change scroll
    window.addEventListener("hashchange", () => {
      scrollToId(location.hash.slice(1));
    });
    window.addEventListener("click", (e) => {
      handleRightBarClick(e);
    });
    addCopyButton();
    findNextAndPreviousPath();
  });
  onMount(async () => {});
</script>

<svelte:head>
  <title>{data.title}</title>
  <meta name="description" content={data.description} />
  <link rel="canonical" href="https://kener.ing/docs{data.docFilePath.split('.md')[0]}" />
</svelte:head>

<div id="markdown">
  {@html data.md}
</div>
<div class="mt-4 grid grid-cols-2">
  <div class="col-span-1">
    {#if previousPath}
      <Button variant="outline" class="no-underline" href={previousPath.link}>
        <ArrowLeft class="mr-2 h-4 w-4" />
        <span>{previousPath.title}</span>
      </Button>
    {/if}
  </div>
  <div class="col-span-1 flex justify-end">
    {#if nextPath}
      <Button variant="outline" class="no-underline" href={nextPath.link}>
        <span>{nextPath.title}</span>
        <ArrowRight class="ml-2 h-4 w-4" />
      </Button>
    {/if}
  </div>
</div>

<style>
  #markdown {
    scroll-behavior: smooth;
  }
</style>
