// @ts-nocheck
// @ts-nocheck
import {
	IsValidURL,
	IsValidGHObject,
	IsValidObject,
	IsValidNav,
	IsValidHero,
	IsValidI18n,
	IsValidAnalytics,
	IsValidColors,
	IsValidJSONString
} from "./validators.js";
import db from "../db/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const saltRounds = 10;
const DUMMY_SECRET = "DUMMY_SECRET";

const siteDataKeys = [
	{
		key: "title",
		isValid: (value) => typeof value === "string" && value.trim().length > 0,
		dataType: "string"
	},
	{
		key: "siteName",
		isValid: (value) => typeof value === "string" && value.trim().length > 0,
		dataType: "string"
	},
	{
		key: "siteURL",
		isValid: IsValidURL,
		dataType: "string"
	},
	{
		key: "home",
		isValid: (value) => typeof value === "string" && value.trim().length > 0,
		dataType: "string"
	},
	{
		key: "favicon",
		isValid: (value) => typeof value === "string" && value.trim().length > 0,
		dataType: "string"
	},
	{
		key: "logo",
		isValid: (value) => typeof value === "string" && value.trim().length > 0,
		dataType: "string"
	},
	{
		key: "github",
		isValid: IsValidGHObject,
		dataType: "object"
	},
	{
		key: "metaTags",
		isValid: IsValidJSONString,
		dataType: "object"
	},
	{
		key: "nav",
		isValid: IsValidNav,
		dataType: "object"
	},
	{
		key: "hero",
		isValid: IsValidHero,
		dataType: "object"
	},
	{
		key: "footerHTML",
		isValid: (value) => typeof value === "string",
		dataType: "string"
	},
	{
		key: "i18n",
		isValid: IsValidI18n,
		dataType: "object"
	},
	{
		key: "pattern",
		//string dots or sqaures or circ
		isValid: (value) =>
			typeof value === "string" && ["dots", "squares", "none"].includes(value),
		dataType: "string"
	},
	{
		key: "analytics",
		isValid: IsValidAnalytics,
		dataType: "object"
	},
	{
		key: "theme",
		//light dark system none
		isValid: (value) =>
			typeof value === "string" && ["light", "dark", "system", "none"].includes(value),
		dataType: "string"
	},
	{
		key: "themeToggle",
		//boolean
		isValid: (value) => typeof value === "string",
		dataType: "string"
	},
	{
		key: "barStyle",
		//PARTIAL or FULL
		isValid: (value) => typeof value === "string" && ["PARTIAL", "FULL"].includes(value),
		dataType: "string"
	},
	{
		key: "barRoundness",
		//SHARP or ROUNDED
		isValid: (value) => typeof value === "string" && ["SHARP", "ROUNDED"].includes(value),
		dataType: "string"
	},
	{
		key: "summaryStyle",
		//CURRENT or DAY
		isValid: (value) => typeof value === "string" && ["CURRENT", "DAY"].includes(value),
		dataType: "string"
	},
	{
		key: "colors",
		isValid: IsValidColors,
		dataType: "object"
	},
	{
		key: "font",
		isValid: IsValidJSONString,
		dataType: "object"
	},
	{
		key: "categories",
		isValid: IsValidJSONString,
		dataType: "object"
	}
];

export function InsertKeyValue(key, value) {
	let f = siteDataKeys.find((k) => k.key === key);
	if (!f) {
		console.trace(`Invalid key: ${key}`);
		throw new Error(`Invalid key: ${key}`);
	}
	if (!f.isValid(value)) {
		console.trace(`Invalid value for key: ${key}`);
		throw new Error(`Invalid value for key: ${key}`);
	}
	let isValid = siteDataKeys.find((k) => k.key === key).isValid(value);
	if (!isValid) {
		console.trace(`Invalid value for key: ${key}`);
		throw new Error(`Invalid value for key: ${key}`);
	}
	return db.insertOrUpdateSiteData(key, value, f.dataType);
}

export async function GetAllSiteData() {
	let data = await db.getAllSiteData();
	//return all data as key value pairs, tranform using dataType
	let transformedData = {};
	for (const d of data) {
		if (d.dataType === "object") {
			transformedData[d.key] = JSON.parse(d.value);
		} else {
			transformedData[d.key] = d.value;
		}
	}
	return transformedData;
}

export async function GetGithubData() {
	let data = await db.getSiteData("github");
	if (!data) {
		return null;
	}
	return JSON.parse(data.value);
}

export const CreateUpdateMonitor = async (monitor) => {
	let monitorData = { ...monitor };
	if (monitorData.id) {
		return await db.updateMonitor(monitorData);
	} else {
		return await db.insertMonitor(monitorData);
	}
};

export const GetMonitors = async (data) => {
	return await db.getMonitors(data);
};
export const GetMonitorsParsed = async (data) => {
	let monitors = await db.getMonitors(data);
	let parsedMonitors = monitors.map((m) => {
		let parsedMonitor = { ...m };
		if (!!parsedMonitor.typeData) {
			parsedMonitor.typeData = JSON.parse(parsedMonitor.typeData);
		} else {
			parsedMonitor.typeData = {};
		}
		return parsedMonitor;
	});
	return parsedMonitors;
};

export const CreateUpdateTrigger = async (alert) => {
	let alertData = { ...alert };
	if (alertData.id) {
		return await db.updateTrigger(alertData);
	} else {
		return await db.createNewTrigger(alertData);
	}
};

export const GetAllTriggers = async (data) => {
	return await db.getTriggers(data);
};

export const UpdateTriggerData = async (data) => {
	return await db.updateMonitorTrigger(data);
};

export const HashPassword = async (plainTextPassword) => {
	try {
		const hash = await bcrypt.hash(plainTextPassword, saltRounds);
		return hash;
	} catch (err) {
		console.error("Error hashing password:", err);
		throw err;
	}
};
const GenerateSalt = async () => {
	try {
		const salt = await bcrypt.genSalt(saltRounds);
		console.log("Generated Salt:", salt);
		return salt;
	} catch (err) {
		console.error("Error generating salt:", err);
		throw err;
	}
};

export const VerifyPassword = async (plainTextPassword, hashedPassword) => {
	try {
		const isMatch = await bcrypt.compare(plainTextPassword, hashedPassword);
		return isMatch;
	} catch (err) {
		console.error("Error verifying password:", err);
		throw err;
	}
};

export const GenerateToken = async (data) => {
	try {
		const token = jwt.sign(data, process.env.KENER_SECRET_KEY || DUMMY_SECRET, {
			expiresIn: "1y"
		});
		return token;
	} catch (err) {
		console.error("Error generating token:", err);
		throw err;
	}
};

export const VerifyToken = async (token) => {
	try {
		const decoded = jwt.verify(token, process.env.KENER_SECRET_KEY || DUMMY_SECRET);
		return decoded; // Returns the decoded payload if the token is valid
	} catch (err) {
		console.error("Error verifying token:", err);
		return undefined; // Returns null if the token is invalid
	}
};

export const GetAllAlertsPaginated = async (data) => {
	return {
		alerts: await db.getMonitorAlertsPaginated(data.page, data.limit),
		total: await db.getMonitorAlertsCount()
	};
};
function generateApiKey() {
	const prefix = "kener_";
	const randomKey = crypto.randomBytes(32).toString("hex"); // 64-character hexadecimal string
	return prefix + randomKey;
}
function createHash(apiKey) {
	return crypto
		.createHmac("sha256", process.env.KENER_SECRET_KEY || DUMMY_SECRET)
		.update(apiKey)
		.digest("hex");
}

export const MaskString = (str) => {
	const len = str.length;
	const mask = "*";
	const masked = mask.repeat(len - 4) + str.substring(len - 4);
	return masked;
};

export const CreateNewAPIKey = async (data) => {
	//generate a new key
	const apiKey = generateApiKey();
	const hashedKey = await createHash(apiKey);
	//insert into db
	await db.createNewApiKey({
		name: data.name,
		hashedKey: hashedKey,
		maskedKey: MaskString(apiKey)
	});

	return {
		apiKey: apiKey,
		name: data.name
	};
};

export const GetAllAPIKeys = async () => {
	return await db.getAllApiKeys();
};

//update status of api key
export const UpdateApiKeyStatus = async (data) => {
	return await db.updateApiKeyStatus(data);
};

export const VerifyAPIKey = async (apiKey) => {
	const hashedKey = createHash(apiKey);
	// Check if the hash exists in the database
	const record = await db.getApiKeyByHashedKey(hashedKey);

	if (!!record) {
		return record.status == "ACTIVE";
	} // Adjust this for your DB query
	return false;
};

export const IsSetupComplete = async () => {
	let data = await db.getAllSiteData();

	if (!data) {
		return false;
	}
	return data.length > 0;
};
