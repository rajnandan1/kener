<script>
  import { Button } from "$lib/components/ui/button";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import Languages from "lucide-svelte/icons/languages";
  import Menu from "lucide-svelte/icons/menu";
  import { base } from "$app/paths";
  import { analyticsEvent } from "$lib/boringOne";
  import GMI from "$lib/components/gmi.svelte";
  export let data;
  let defaultPattern = data.site?.pattern || "squares";
  let allPets = [
    {
      url: base + "/chicken.gif",
      bottom: "-5"
    },
    {
      url: base + "/dog.gif",
      bottom: "-17"
    },
    {
      url: base + "/cockatiel.gif",
      bottom: "-10"
    },
    {
      url: base + "/crab.gif",
      bottom: "-20"
    },
    {
      url: base + "/fox.gif",
      bottom: "-9"
    },
    {
      url: base + "/horse.gif",
      bottom: "-11"
    },
    {
      url: base + "/panda.gif",
      bottom: "0"
    },
    {
      url: base + "/totoro.gif",
      bottom: "-27"
    },
    {
      url: base + "/rabbit.gif",
      bottom: "0"
    },
    {
      url: base + "/duck.gif",
      bottom: "-5"
    },
    {
      url: base + "/snake.gif",
      bottom: "0"
    }
  ];
  let randomPet = allPets[Math.floor(Math.random() * allPets.length)];
</script>

{#if defaultPattern == "pets" && !!randomPet}
  <div class="pets-pattern" style="background-image: url({randomPet.url});bottom: {randomPet.bottom}px"></div>
{:else}
  <div class="{defaultPattern}-pattern"></div>
{/if}

<header class="sticky top-0 z-50 mx-auto md:mt-2">
  <div class="container flex h-14 max-w-[820px] items-center border bg-card px-3 md:rounded-md">
    <a rel="external" href={data.site.home ? data.site.home : base} class="mr-6 flex items-center space-x-2">
      {#if data.site.logo}
        <GMI src={data.site.logo} classList="w-8" alt={data.site.title} srcset="" />
      {/if}
      {#if data.site.siteName}
        <span class="  inline-block text-[15px] font-bold lg:text-base">
          {data.site.siteName}
        </span>
      {/if}
    </a>
    <div class="flex w-full justify-end">
      {#if data.site.nav}
        <nav class=" hidden flex-wrap items-center text-sm font-medium md:flex">
          {#each data.site.nav as navItem}
            <a
              rel="external"
              href={navItem.url}
              class="flex rounded-md px-3 py-2 text-card-foreground transition-all ease-linear hover:bg-background"
              on:click={() =>
                analyticsEvent("navigation", {
                  name: navItem.name
                })}
            >
              {#if navItem.iconURL}
                <GMI src={navItem.iconURL} classList="mr-1.5 mt-0.5 inline h-4" alt={navItem.name} />
              {/if}
              <span>{navItem.name}</span>
            </a>
          {/each}
        </nav>
        <div class="flex md:hidden">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <Button variant="outline" size="sm">
                <Menu size={14} />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              {#each data.site.nav as navItem}
                <DropdownMenu.Group>
                  <DropdownMenu.Item>
                    <a rel="external" href={navItem.url}> {navItem.name} </a>
                  </DropdownMenu.Item>
                </DropdownMenu.Group>
              {/each}
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>
      {/if}
    </div>
  </div>
</header>
