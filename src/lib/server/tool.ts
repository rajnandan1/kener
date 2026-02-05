import { AllRecordTypes } from "../clientTools.js";
import knexOb from "../../../knexfile.js";
import crypto from "crypto";
import GC from "../global-constants.js";
import { ParseLatency } from "$lib/clientTools.js";
import dotenv from "dotenv";
import type { TimestampStatusCount, UptimeCalculatorResult } from "./db/dbimpl.js";
dotenv.config();
const IsValidURL = function (url: string): boolean {
  return /^(http|https):\/\/[^ "]+$/.test(url);
};
const IsStringURLSafe = function (str: string): boolean {
  const regex = /^[A-Za-z0-9\-_.~]+$/;
  return regex.test(str);
};
const IsValidHTTPMethod = function (method: string): boolean {
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
const GetMinuteStartTimestampUTC = function (timestamp: number): number {
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
const GetDayStartTimestampUTC = function (timestamp: number): number {
  //use js date instead of moment
  const now = new Date(timestamp * 1000);
  const dayStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
  const dayStartTimestamp = dayStart.getTime();
  return Math.floor(dayStartTimestamp / 1000);
};
const GetDayEndTimestampUTC = function (timestamp: number): number {
  //use js date instead of moment
  const now = new Date(timestamp * 1000);
  const dayEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));
  const dayEndTimestamp = dayEnd.getTime();
  return Math.floor(dayEndTimestamp / 1000) + 60;
};
const DurationInMinutes = function (start: number, end: number): number {
  return Math.floor((end - start) / 60);
};
const GetDayStartWithOffset = function (timeStampInSeconds: number, offsetInMinutes: number): number {
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
const BeginningOfDay = (options: { date?: Date; timeZone?: string } = {}): number => {
  const { date = new Date(), timeZone } = options;
  const parts = Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(date);
  const hour = parseInt(parts.find((i) => i.type === "hour")?.value ?? "0");
  const minute = parseInt(parts.find((i) => i.type === "minute")?.value ?? "0");
  const second = parseInt(parts.find((i) => i.type === "second")?.value ?? "0");
  const dt = new Date(1000 * Math.floor((date.getTime() - hour * 3600000 - minute * 60000 - second * 1000) / 1000));
  return dt.getTime() / 1000;
};
const BeginningOfMinute = (options: { date?: Date; timeZone?: string } = {}): number => {
  const { date = new Date(), timeZone } = options;
  const parts = Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    second: "numeric",
  }).formatToParts(date);
  const second = parseInt(parts.find((i) => i.type === "second")?.value ?? "0");
  const dt = new Date(1000 * Math.floor((date.getTime() - second * 1000) / 1000));
  return dt.getTime() / 1000;
};
const ValidateIpAddress = function (input: string): string {
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
function checkIfDuplicateExists(arr: unknown[]): boolean {
  return new Set(arr).size !== arr.length;
}
function GetWordsStartingWithDollar(text: string): string[] {
  const regex = /\$\w+/g;
  const wordsArray = text.match(regex);
  return wordsArray || [];
}
const StatusObj = {
  UP: "api-up",
  DEGRADED: "api-degraded",
  DOWN: "api-down",
  MAINTENANCE: "api-maintenance",
  NO_DATA: "api-nodata",
};
const ParseUptime = function (up: number, all: number): string {
  if (all === 0) return String("-");
  if (up == 0) return String("0");
  if (up == all) {
    return String(((up / all) * 100).toFixed(0));
  }
  //return 50% as 50% and not 50.0000%
  if (((up / all) * 100) % 10 == 0) {
    return String(((up / all) * 100).toFixed(0));
  }
  // Remove trailing zeros
  return String(parseFloat(((up / all) * 100).toFixed(4)));
};
const ParsePercentage = function (n: number): string {
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
function IsValidHost(domain: string): boolean {
  const regex = /^[a-zA-Z0-9]+([\-\.]{1}[a-zA-Z0-9]+)*\.[a-zA-Z]{2,}$/;
  return regex.test(domain);
}

//valid nameserver
function IsValidNameServer(nameServer: string): boolean {
  //8.8.8.8 example
  const regex = /^([0-9]{1,3}\.){3}[0-9]{1,3}$/;
  return regex.test(nameServer);
}

//valid dns record type
function IsValidRecordType(recordType: string): boolean {
  return AllRecordTypes.hasOwnProperty(recordType);
}
function ReplaceAllOccurrences(originalString: string, searchString: string, replacement: string): string {
  const regex = new RegExp(`\\${searchString}`, "g");
  const replacedString = originalString.replace(regex, replacement);
  return replacedString;
}

function GetRequiredSecrets(str: string): Array<{ find: string; replace: string | undefined }> {
  let envSecrets: Array<{ find: string; replace: string | undefined }> = [];
  const requiredSecrets = GetWordsStartingWithDollar(str).map((x: string) => x.substr(1));
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

function ValidateMonitorAlerts(
  alerts:
    | Record<string, { triggers?: unknown[]; failureThreshold?: number; successThreshold?: number }>
    | null
    | undefined,
): boolean {
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
      if (!triggers || triggers.length === 0) {
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
      if (element.failureThreshold !== undefined && element.failureThreshold <= 0) {
        console.log(`Failure threshold is less than or equal to 0 for key: ${key}`);
        return false;
      }
      if (element.successThreshold !== undefined && element.successThreshold <= 0) {
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
function Wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function MaskString(str: string): string {
  if (str.length <= 4) {
    return "*".repeat(str.length);
  }
  return "*".repeat(str.length - 4) + str.slice(-4);
}

function GetDbType() {
  //sqlite, postgresql, mysql
  return knexOb.databaseType;
}
function HashString(str: string): string {
  const hash = crypto.createHash("sha256");
  hash.update(str);
  return hash.digest("hex");
}

//function to validate email address
function ValidateEmail(email: string): boolean {
  const regex =
    /^(?:(?:[a-zA-Z0-9!#$%&'*+\-/=?^_`{|}~]+\.)*[a-zA-Z0-9!#$%&'*+\-/=?^_`{|}~]+)@(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}|(?:\[(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)(?:\.(?!$)|$)){4}\]))$/;
  return regex.test(email);
}

//function to validate URL
function ValidateURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

//function to generate 6 digit random number, number of digits as argument
function GenerateRandomNumber(digits: number): number {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Validate uptime formula
// Valid values: up, down, degraded, maintenance
// Valid operators: + - * /
// Example: "up + maintenance", "up + down + degraded + maintenance"
function IsValidUptimeFormula(formula: string): boolean {
  if (!formula || typeof formula !== "string") return false;

  // Remove all whitespace for easier parsing
  const normalized = formula.toLowerCase().replace(/\s+/g, "");

  // Check for empty string after normalization
  if (normalized.length === 0) return false;

  // Valid variables
  const validVars = ["up", "down", "degraded", "maintenance"];

  // Valid operators
  const validOperators = ["+", "-", "*", "/"];

  // Tokenize: split by operators while keeping operators
  const tokens: string[] = [];
  let currentToken = "";

  for (const char of normalized) {
    if (validOperators.includes(char)) {
      if (currentToken) {
        tokens.push(currentToken);
        currentToken = "";
      }
      tokens.push(char);
    } else {
      currentToken += char;
    }
  }
  if (currentToken) {
    tokens.push(currentToken);
  }

  // Must have at least one token
  if (tokens.length === 0) return false;

  // Validate token sequence: must alternate between variable and operator
  // First token must be a variable, last token must be a variable
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (i % 2 === 0) {
      // Even index: must be a variable
      if (!validVars.includes(token)) return false;
    } else {
      // Odd index: must be an operator
      if (!validOperators.includes(token)) return false;
    }
  }

  // Last token must be a variable (tokens.length must be odd)
  if (tokens.length % 2 === 0) return false;

  return true;
}

// Safely evaluate a mathematical expression with only numbers and basic operators
// Returns the calculated result or 0 if invalid
function SafeEvaluateExpression(expression: string): number {
  // Remove all whitespace
  const normalized = expression.replace(/\s+/g, "");

  // Tokenize into numbers and operators
  const tokens: (number | string)[] = [];
  let currentNum = "";

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    if (char === "+" || char === "-" || char === "*" || char === "/") {
      if (currentNum) {
        tokens.push(parseFloat(currentNum));
        currentNum = "";
      }
      tokens.push(char);
    } else if (/[\d.]/.test(char)) {
      currentNum += char;
    }
  }
  if (currentNum) {
    tokens.push(parseFloat(currentNum));
  }

  // Validate tokens - must start and end with numbers, alternating
  if (tokens.length === 0) return 0;
  if (tokens.length % 2 === 0) return 0; // Must be odd (n numbers, n-1 operators)

  // First pass: handle * and /
  const addSubTokens: (number | string)[] = [];
  let i = 0;
  while (i < tokens.length) {
    if (typeof tokens[i] === "number") {
      let value = tokens[i] as number;
      // Look ahead for * or /
      while (i + 2 < tokens.length && (tokens[i + 1] === "*" || tokens[i + 1] === "/")) {
        const operator = tokens[i + 1] as string;
        const nextValue = tokens[i + 2] as number;
        if (operator === "*") {
          value *= nextValue;
        } else if (operator === "/") {
          if (nextValue === 0) return 0; // Avoid division by zero
          value /= nextValue;
        }
        i += 2;
      }
      addSubTokens.push(value);
    } else {
      // It's + or -
      addSubTokens.push(tokens[i]);
    }
    i++;
  }

  // Second pass: handle + and -
  let result = addSubTokens[0] as number;
  for (let j = 1; j < addSubTokens.length; j += 2) {
    const operator = addSubTokens[j] as string;
    const value = addSubTokens[j + 1] as number;
    if (operator === "+") {
      result += value;
    } else if (operator === "-") {
      result -= value;
    }
  }

  return result;
}

function UptimeCalculator(
  data: TimestampStatusCount[],
  numeratorStr?: string,
  denominatorStr?: string,
): UptimeCalculatorResult {
  let up = 0;
  let degraded = 0;
  let down = 0;
  let maintenance = 0;
  let latencySum = 0;
  let latencyCount = 0;

  for (let i = 0; i < data.length; i++) {
    const element = data[i];
    up += element.countOfUp;
    degraded += element.countOfDegraded;
    down += element.countOfDown;
    maintenance += element.countOfMaintenance;
    latencySum += element.avgLatency;
    latencyCount += 1;
  }

  // Default formulas
  const defaultNumeratorStr = GC.defaultNumeratorStr;
  const defaultDenominatorStr = GC.defaultDenominatorStr;

  // Use provided formulas or defaults
  let numFormula = numeratorStr && IsValidUptimeFormula(numeratorStr) ? numeratorStr : defaultNumeratorStr;
  let denFormula = denominatorStr && IsValidUptimeFormula(denominatorStr) ? denominatorStr : defaultDenominatorStr;

  // Replace variables with their values
  const replaceVariables = (formula: string): string => {
    return formula
      .toLowerCase()
      .replace(/\bup\b/g, String(up))
      .replace(/\bdown\b/g, String(down))
      .replace(/\bdegraded\b/g, String(degraded))
      .replace(/\bmaintenance\b/g, String(maintenance));
  };

  const numeratorExpr = replaceVariables(numFormula);
  const denominatorExpr = replaceVariables(denFormula);

  const numerator = SafeEvaluateExpression(numeratorExpr);
  const denominator = SafeEvaluateExpression(denominatorExpr);

  return {
    uptime: ParseUptime(numerator, denominator),
    avgLatency: latencyCount > 0 ? ParseLatency(latencySum / latencyCount) : "",
  };
}

export {
  IsValidURL,
  UptimeCalculator,
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
  ValidateURL,
  GenerateRandomNumber,
  IsValidUptimeFormula,
};
