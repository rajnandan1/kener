<script>
  export let data;
  const basePath = data.basePath;
  export let src = "";
  export let alt = "GMI";
  export let classList = "";
  export let style = "";
  export let srcset = "";
  if (!src.startsWith("http")) src = `${basePath}${src}`;
</script>

<img {src} {alt} class={classList} {style} {srcset} />
