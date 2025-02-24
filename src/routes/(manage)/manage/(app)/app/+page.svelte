<script>
	import { goto, afterNavigate } from "$app/navigation";

  export let data;
  const basePath = data.basePath;

	afterNavigate((e) => {
		goto(basePath + "/manage/app/site");
	});
</script>
