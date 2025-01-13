// @ts-nocheck
const l = function (sessionLangMap, key, args = {}) {
	const keys = key.split(".");
	let obj = sessionLangMap;

	for (const keyPart of keys) {
		obj = obj?.[keyPart];
		if (!obj) {
			break;
		}
	}

	// Replace placeholders in the string using the args object
	if (obj && typeof obj === "string") {
		obj = obj.replace(/%\w+/g, (placeholder) => {
			const argKey = placeholder.slice(1); // Remove the `%` to get the key
			return args[argKey] !== undefined ? args[argKey] : placeholder;
		});
	}

	return obj || key;
};
const summaryTime = function (summaryStatus) {
	if (summaryStatus == "No Data") {
		return "No Data";
	}
	if (summaryStatus == "UP") {
		return "Status OK";
	}

	return "%status for %duration";
};

const n = function (
	/** @type {{ numbers: { [x: string]: any; }; }} */ sessionLangMap,
	/** @type {string} */ inputString
) {
	const translations = sessionLangMap.numbers;
	console.trace("translations", translations);
	// @ts-ignore
	return inputString.replace(
		/\d/g,
		(/** @type {string | number} */ match) => translations[match] || match
	);
};
const ampm = function (
	/** @type {{ monitor: { [x: string]: any; }; }} */ sessionLangMap,
	/** @type {string} */ inputString
) {
	const translations = sessionLangMap.monitor;

	// @ts-ignore
	let resp = inputString.replace(/(am|pm)/g, function (/** @type {string | number} */ match) {
		return translations[match] || match;
	});

	return resp;
};

export { l, summaryTime, n, ampm };
