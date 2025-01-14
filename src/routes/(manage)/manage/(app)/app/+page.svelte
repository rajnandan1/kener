<script>
	import { goto, afterNavigate } from "$app/navigation";
	import { base } from "$app/paths";

	afterNavigate((e) => {
		goto(base + "/manage/app/site");
	});
</script>
