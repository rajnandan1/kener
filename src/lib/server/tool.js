// @ts-nocheck
import { AllRecordTypes } from "./constants.js";
import knexOb from "../../../knexfile.js";
import crypto from "crypto";

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
    0,
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
    0,
  );
  const minuteStartTimestamp = minuteStart.getTime();
  return Math.floor(minuteStartTimestamp / 1000);
};
//return given timestamp day start timestamp in UTC
const GetDayStartTimestampUTC = function (timestamp) {
  //use js date instead of moment
  const now = new Date(timestamp * 1000);
  const dayStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
  const dayStartTimestamp = dayStart.getTime();
  return Math.floor(dayStartTimestamp / 1000);
};
const GetDayEndTimestampUTC = function (timestamp) {
  //use js date instead of moment
  const now = new Date(timestamp * 1000);
  const dayEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));
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
    second: "numeric",
  }).formatToParts(date);
  const hour = parseInt(parts.find((i) => i.type === "hour").value);
  const minute = parseInt(parts.find((i) => i.type === "minute").value);
  const second = parseInt(parts.find((i) => i.type === "second").value);
  const dt = new Date(1000 * Math.floor((date - hour * 3600000 - minute * 60000 - second * 1000) / 1000));
  return dt.getTime() / 1000;
};
const BeginningOfMinute = (options = {}) => {
  const { date = new Date(), timeZone } = options;
  const parts = Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    second: "numeric",
  }).formatToParts(date);
  const second = parseInt(parts.find((i) => i.type === "second").value);
  const dt = new Date(1000 * Math.floor((date - second * 1000) / 1000));
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
function GetWordsStartingWithDollar(text) {
  const regex = /\$\w+/g;
  const wordsArray = text.match(regex);
  return wordsArray || [];
}
const StatusObj = {
  UP: "api-up",
  DEGRADED: "api-degraded",
  DOWN: "api-down",
  NO_DATA: "api-nodata",
};
// @ts-ignore
const ParseUptime = function (up, all) {
  if (all === 0) return String("-");
  if (up == 0) return String("0");
  if (up == all) {
    return String(((up / all) * parseFloat(100)).toFixed(0));
  }
  //return 50% as 50% and not 50.0000%
  if (((up / all) * 100) % 10 == 0) {
    return String(((up / all) * parseFloat(100)).toFixed(0));
  }
  return String(((up / all) * parseFloat(100)).toFixed(4));
};
const ParsePercentage = function (n) {
  if (isNaN(n)) return "-";
  if (n == 0) {
    return "0";
  }
  if (n == 100) {
    return "100";
  }
  return n.toFixed(4);
};

//valid domain name
function IsValidHost(domain) {
  const regex = /^[a-zA-Z0-9]+([\-\.]{1}[a-zA-Z0-9]+)*\.[a-zA-Z]{2,}$/;
  return regex.test(domain);
}

//valid nameserver
function IsValidNameServer(nameServer) {
  //8.8.8.8 example
  const regex = /^([0-9]{1,3}\.){3}[0-9]{1,3}$/;
  return regex.test(nameServer);
}

//valid dns record type
function IsValidRecordType(recordType) {
  return AllRecordTypes.hasOwnProperty(recordType);
}
function ReplaceAllOccurrences(originalString, searchString, replacement) {
  const regex = new RegExp(`\\${searchString}`, "g");
  const replacedString = originalString.replace(regex, replacement);
  return replacedString;
}

function GetRequiredSecrets(str) {
  let envSecrets = [];
  const requiredSecrets = GetWordsStartingWithDollar(str).map((x) => x.substr(1));
  for (const [key, value] of Object.entries(process.env)) {
    if (requiredSecrets.indexOf(key) !== -1) {
      envSecrets.push({
        find: `$${key}`,
        replace: value,
      });
    }
  }
  return envSecrets;
}

function ValidateMonitorAlerts(alerts) {
  if (!alerts) {
    console.log("Alerts object is not provided.");
    return false;
  }
  // if down degraded not present return false
  if (!alerts.hasOwnProperty("DOWN") && !alerts.hasOwnProperty("DEGRADED")) {
    console.log("Alerts object does not have DOWN or DEGRADED properties.");
    return false;
  }
  let statues = Object.keys(alerts);
  //can be either DOWN or DEGRADED
  let validKeys = ["DOWN", "DEGRADED"];
  for (let i = 0; i < statues.length; i++) {
    const keyName = statues[i];
    if (!validKeys.includes(keyName)) {
      console.log(`Invalid key found in alerts: ${keyName}`);
      return false;
    }
  }
  for (const key in alerts) {
    if (Object.prototype.hasOwnProperty.call(alerts, key)) {
      const element = alerts[key];
      const triggers = element.triggers;
      //if triggers not present return false
      if (!element.hasOwnProperty("triggers")) {
        console.log(`Triggers not present for key: ${key}`);
        return false;
      }
      //if length of triggers is 0 return false
      if (triggers.length === 0) {
        console.log(`Triggers length is 0 for key: ${key}`);
        return false;
      }
      if (!element.hasOwnProperty("failureThreshold") || !element.hasOwnProperty("successThreshold")) {
        console.log(`Thresholds not present for key: ${key}`);
        return false;
      }
      if (element.hasOwnProperty("failureThreshold") && !Number.isInteger(element.failureThreshold)) {
        console.log(`Failure threshold is not an integer for key: ${key}`);
        return false;
      }
      if (element.hasOwnProperty("successThreshold") && !Number.isInteger(element.successThreshold)) {
        console.log(`Success threshold is not an integer for key: ${key}`);
        return false;
      }
      if (element.hasOwnProperty("failureThreshold") && element.failureThreshold <= 0) {
        console.log(`Failure threshold is less than or equal to 0 for key: ${key}`);
        return false;
      }
      if (element.hasOwnProperty("successThreshold") && element.successThreshold <= 0) {
        console.log(`Success threshold is less than or equal to 0 for key: ${key}`);
        return false;
      }
    }
  }
  return true;
}
function GenerateRandomColor() {
  var randomColor = Math.floor(Math.random() * 16777215).toString(16);
  return randomColor;
}

//wait for x ms promise
function Wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function MaskString(str) {
  if (str.length <= 4) {
    return "*".repeat(str.length);
  }
  return "*".repeat(str.length - 4) + str.slice(-4);
}

function GetDbType() {
  //sqlite, postgresql, mysql
  return knexOb.databaseType;
}
function HashString(str) {
  const hash = crypto.createHash("sha256");
  hash.update(str);
  return hash.digest("hex");
}

//function to validate email address
function ValidateEmail(email) {
  const regex =
    /^(?:(?:[a-zA-Z0-9!#$%&'*+\-/=?^_`{|}~]+\.)*[a-zA-Z0-9!#$%&'*+\-/=?^_`{|}~]+)@(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}|(?:\[(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)(?:\.(?!$)|$)){4}\]))$/;
  return regex.test(email);
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
  GetWordsStartingWithDollar,
  StatusObj,
  ParseUptime,
  ParsePercentage,
  IsValidHost,
  IsValidRecordType,
  IsValidNameServer,
  ReplaceAllOccurrences,
  GetRequiredSecrets,
  ValidateMonitorAlerts,
  GenerateRandomColor,
  BeginningOfMinute,
  Wait,
  MaskString,
  GetDbType,
  HashString,
  ValidateEmail,
};
