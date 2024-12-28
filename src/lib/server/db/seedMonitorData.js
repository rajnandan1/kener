let seedMonitorData = [
	{
		tag: "earth",
		name: "Earth - Planet 3",
		description:
			"Earth is the 3rd planet in our solar system and it is the most majestic one. ",
		image: "https://kener.ing/earth.png",
		cron: "* * * * *",
		defaultStatus: "UP",
		status: "ACTIVE",
		categoryName: "Home",
		monitorType: "NONE",
		downTrigger: null,
		degradedTrigger: null,
		typeData: "",
		dayDegradedMinimumCount: 0,
		dayDownMinimumCount: 0,
		includeDegradedInDowntime: "NO"
	}
];

export default seedMonitorData;
