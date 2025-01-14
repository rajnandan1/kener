let seedMonitorData = [
	{
		tag: "earth",
		name: "Earth - Planet 3",
		description:
			"Earth is the 3rd planet in our solar system and it is the most majestic one. ",
		image: "https://kener.ing/earth.png",
		cron: "* * * * *",
		default_status: "UP",
		status: "ACTIVE",
		category_name: "Home",
		monitor_type: "NONE",
		down_trigger: null,
		degraded_trigger: null,
		type_data: "",
		day_degraded_minimum_count: 1,
		day_down_minimum_count: 1,
		include_degraded_in_downtime: "NO"
	}
];

export default seedMonitorData;
