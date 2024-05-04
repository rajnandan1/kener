const l = function (/** @type {any} */ sessionLangMap, /** @type {string} */ key) {
	const keys = key.split(".");
	let obj = sessionLangMap;
	for (const key of keys) {
		// @ts-ignore
		obj = obj[key];
		if (!obj) {
			break;
		}
	}
	return obj || key;
};

const summaryTime = function (/** @type {any} */ sessionLangMap, /** @type {string} */ message) {
	if (message == "No Data") {
		return sessionLangMap.monitor.status_no_data;
	}
	if (message == "Status OK") {
		return sessionLangMap.monitor.status_ok;
	}

	const expectedStrings = [
		{
			regexes: [/^(DEGRADED|DOWN)/g, /\d+ minute$/g],
			s: sessionLangMap.monitor.status_x_minute,
			output: function (
				/** @type {string} */ message,
				/** @type {{ statuses: { [x: string]: any; }; numbers: { [x: string]: any; }; }} */ sessionLangMap
			) {
				let match = message.match(this.regexes[0]);
				const status = match ? match[0] : null;
				if (!status) {
					return message;
				}
				match = message.match(this.regexes[1]);
				const duration = match ? match[0] : null;
				if (!duration) {
					return message;
				}

				const digits = duration
					.replace(" minute", "")
					.split("")
					.map((elem) => {
						return sessionLangMap.numbers[String(elem)];
					})
					.join("");
				return this.s
					.replace(/%status/g, sessionLangMap.statuses[status])
					.replace(/%minute/, digits);
			}
		},
		{
			regexes: [/^(DEGRADED|DOWN)/g, /\d+ minutes$/g],
			s: sessionLangMap.monitor.status_x_minutes,
			output: function (
				/** @type {string} */ message,
				/** @type {{ statuses: { [x: string]: any; }; numbers: { [x: string]: any; }; }} */ sessionLangMap
			) {
				let match = message.match(this.regexes[0]);
				const status = match ? match[0] : null;
				if (!status) {
					return message;
				}

				match = message.match(this.regexes[1]);
				const duration = match ? match[0] : null;

				if (!duration) {
					return message;
				}

				const digits = duration
					.replace(" minutes", "")
					.split("")
					.map((elem) => {
						return sessionLangMap.numbers[String(elem)];
					})
					.join("");

				let res = this.s
					.replace(/%status/g, sessionLangMap.statuses[status])
					.replace(/%minutes/, digits);
				return res;
			}
		},
		{
			regexes: [/^(DEGRADED|DOWN)/g, /\d+h/g, /\d+m$/g],
			s: sessionLangMap.monitor.status_x_hour_y_minute,
			output: function (
				/** @type {string} */ message,
				/** @type {{ statuses: { [x: string]: any; }; numbers: { [x: string]: any; }; }} */ sessionLangMap
			) {
				let match = message.match(this.regexes[0]);
				const status = match ? match[0] : null;
				if (!status) {
					return message;
				}
				match = message.match(this.regexes[1]);
				const hour = match ? match[0] : null;
				if (!hour) {
					return message;
				}
				match = message.match(this.regexes[2]);
				const minute = match ? match[0] : null;
				if (!minute) {
					return message;
				}

				const digits = hour
					.replace("h", "")
					.split("")
					.map((elem) => {
						return sessionLangMap.numbers[String(elem)];
					})
					.join("");
				const digits2 = minute
					.replace("m", "")
					.split("")
					.map((elem) => {
						return sessionLangMap.numbers[String(elem)];
					})
					.join("");

				return this.s
					.replace(/%status/g, sessionLangMap.statuses[status])
					.replace(/%hours/g, digits)
					.replace(/%minutes/, digits2);
			}
		},
		{
			regexes: [/^Last \d+ hours$/g],
			s: sessionLangMap.root.last_x_hours,
			output: function (
				/** @type {string} */ message,
				/** @type {{ statuses: { [x: string]: any; }; numbers: { [x: string]: any; }; }} */ sessionLangMap
			) {
				//extract the number out of message
				let match = message.match(/\d+/g);
				const hours = match ? match[0] : null;
				if (!hours) {
					return message;
				}
				const digits = hours
					.split("")
					.map((elem) => {
						return sessionLangMap.numbers[String(elem)];
					})
					.join("");

				return this.s.replace(/%hours/g, digits);
			}
		}
	];

	//loop through the expectedStrings array and find the matching string
	let selectedIndex = -1;
	for (let i = 0; i < expectedStrings.length; i++) {
		let matchCount = 0;
		for (let j = 0; j < expectedStrings[i].regexes.length; j++) {
			if (message.match(expectedStrings[i].regexes[j])) {
				matchCount++;
			}
		}
		if (matchCount == expectedStrings[i].regexes.length) {
			selectedIndex = i;
			break;
		}
	}
	if (selectedIndex < 0) {
		return message;
	}

	const selectedReplace = expectedStrings[selectedIndex];
	return selectedReplace.output(message, sessionLangMap);
};

const n = function (
	/** @type {{ numbers: { [x: string]: any; }; }} */ sessionLangMap,
	/** @type {string} */ inputString
) {
	const translations = sessionLangMap.numbers;

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
