// @ts-nocheck
import dotenv from "dotenv";
dotenv.config();
const IsValidURL = function (url) {
	return /^(http|https):\/\/[^ "]+$/.test(url);
};
const IsStringURLSafe = function (str) {
	const regex = /^[A-Za-z0-9\-_.~]+$/;
	return regex.test(str);
};
const IsValidHTTPMethod = function (method) {
	return /^(GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH)$/.test(method);
};
function generateRandomColor() {
	var randomColor = Math.floor(Math.random() * 16777215).toString(16);
	return randomColor;
	//random color will be freshly served
}

//return given timestamp in UTC
const GetNowTimestampUTC = function () {
	//use js date instead of moment
	const now = new Date();
	const timestamp = now.getTime();
	return Math.floor(timestamp / 1000);
};
//return given timestamp minute start timestamp in UTC
const GetMinuteStartTimestampUTC = function (timestamp) {
	//use js date instead of moment
	const now = new Date(timestamp * 1000);
	const minuteStart = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate(),
		now.getHours(),
		now.getMinutes(),
		0,
		0
	);
	const minuteStartTimestamp = minuteStart.getTime();
	return Math.floor(minuteStartTimestamp / 1000);
};
//return current timestamp minute start timestamp in UTC
const GetMinuteStartNowTimestampUTC = function () {
	//use js date instead of moment
	const now = new Date();
	const minuteStart = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate(),
		now.getHours(),
		now.getMinutes(),
		0,
		0
	);
	const minuteStartTimestamp = minuteStart.getTime();
	return Math.floor(minuteStartTimestamp / 1000);
};
//return given timestamp day start timestamp in UTC
const GetDayStartTimestampUTC = function (timestamp) {
	//use js date instead of moment
	const now = new Date(timestamp * 1000);
	const dayStart = new Date(
		Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
	);
	const dayStartTimestamp = dayStart.getTime();
	return Math.floor(dayStartTimestamp / 1000);
};
const GetDayEndTimestampUTC = function (timestamp) {
	//use js date instead of moment
	const now = new Date(timestamp * 1000);
	const dayEnd = new Date(
		Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
	);
	const dayEndTimestamp = dayEnd.getTime();
	return Math.floor(dayEndTimestamp / 1000) + 60;
};
const DurationInMinutes = function (start, end) {
	return Math.floor((end - start) / 60);
};
const GetDayStartWithOffset = function (timeStampInSeconds, offsetInMinutes) {
	const then = new Date(GetMinuteStartTimestampUTC(timeStampInSeconds) * 1000);
	let dayStartThen = GetDayStartTimestampUTC(then.getTime() / 1000);
	let dayStartTomorrow = dayStartThen + 24 * 60 * 60;
	let dayStartYesterday = dayStartThen - 24 * 60 * 60;
	//have to figure out when to add a day
	//20-12AM 			[21-12AM] 	=21:630  xtm 	[22-12AM]   xtd	   =22:630 		23-12AM

	//if xtm - 330 >  1 day , add a day to xtm - 330

	if (offsetInMinutes < 0) {
		//add one day to dayStartThen
		dayStartThen = dayStartThen + 24 * 60 * 60;
	}
	return dayStartThen + offsetInMinutes * 60;
};
const BeginningOfDay = (options = {}) => {
	const { date = new Date(), timeZone } = options;
	const parts = Intl.DateTimeFormat("en-US", {
		timeZone,
		hourCycle: "h23",
		hour: "numeric",
		minute: "numeric",
		second: "numeric"
	}).formatToParts(date);
	const hour = parseInt(parts.find((i) => i.type === "hour").value);
	const minute = parseInt(parts.find((i) => i.type === "minute").value);
	const second = parseInt(parts.find((i) => i.type === "second").value);
	const dt = new Date(
		1000 * Math.floor((date - hour * 3600000 - minute * 60000 - second * 1000) / 1000)
	);
	return dt.getTime() / 1000;
};
const ValidateIpAddress = function (input) {
	// Check if input is a valid IPv4 address
	const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
	if (ipv4Regex.test(input)) {
		return "IPv4";
	}

	// Check if input is a valid IPv6 address
	const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
	if (ipv6Regex.test(input)) {
		return "IPv6";
	}

	// Check if input is a valid domain name
	const domainRegex = /^[a-zA-Z0-9]+([\-\.]{1}[a-zA-Z0-9]+)*\.[a-zA-Z]{2,}$/;
	if (domainRegex.test(input)) {
		return "Domain Name";
	}

	// If none of the above conditions match, the input is invalid
	return "Invalid";
};
function checkIfDuplicateExists(arr) {
	return new Set(arr).size !== arr.length;
}
function getWordsStartingWithDollar(text) {
	const regex = /\$\w+/g;
	const wordsArray = text.match(regex);
	return wordsArray || [];
}
export {
	IsValidURL,
	IsValidHTTPMethod,
	GetMinuteStartTimestampUTC,
	GetNowTimestampUTC,
	GetDayStartTimestampUTC,
	GetMinuteStartNowTimestampUTC,
	DurationInMinutes,
	GetDayStartWithOffset,
	BeginningOfDay,
	IsStringURLSafe,
	ValidateIpAddress,
	checkIfDuplicateExists,
	getWordsStartingWithDollar
};
