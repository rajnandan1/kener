<script>
  import { base } from "$app/paths";
  export let src = "";
  export let alt = "GMI";
  export let classList = "";
  export let style = "";
  export let srcset = "";
  if (!src.startsWith("http")) src = `${base}${src}`;
</script>

<img {src} {alt} class={classList} {style} {srcset} />
