import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BeginningOfDay,
  BeginningOfMinute,
  checkIfDuplicateExists,
  DurationInMinutes,
  GetDayStartTimestampUTC,
  GetDayStartWithOffset,
  GetMinuteStartNowTimestampUTC,
  GetMinuteStartTimestampUTC,
  GetNowTimestampUTC,
  GetNowTimestampUTCInMs,
  GetRequiredSecrets,
  GetWordsStartingWithDollar,
  HashString,
  IsStringURLSafe,
  IsValidHost,
  IsValidHTTPMethod,
  IsValidNameServer,
  IsValidURL,
  IsValidUptimeFormula,
  MaskString,
  ParsePercentage,
  ParseUptime,
  ReplaceAllOccurrences,
  UnparsePercentage,
  UptimeCalculator,
  ValidateEmail,
  ValidateIpAddress,
  ValidateMonitorAlerts,
  ValidateURL,
} from "./tool";
import type { TimestampStatusCount } from "./types/db";

// The npm scripts pin TZ=UTC, so local-date-based functions (GetDayStartTimestampUTC
// mixes local date parts with Date.UTC) are deterministic here. Fixtures still use
// noon UTC so the tests stay safe even if vitest is run directly without the pin.
const NOON_UTC = 1768478400; // 2026-01-15T12:00:00Z
const DAY_START = 1768435200; // 2026-01-15T00:00:00Z

describe("timestamp helpers", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("GetNowTimestampUTC returns the current epoch in seconds", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
    expect(GetNowTimestampUTC()).toBe(NOON_UTC);
  });

  it("GetNowTimestampUTCInMs returns the current epoch in milliseconds", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
    expect(GetNowTimestampUTCInMs()).toBe(NOON_UTC * 1000);
  });

  it("GetMinuteStartTimestampUTC floors a timestamp to the start of its minute", () => {
    expect(GetMinuteStartTimestampUTC(NOON_UTC + 45)).toBe(NOON_UTC);
    expect(GetMinuteStartTimestampUTC(NOON_UTC)).toBe(NOON_UTC);
    expect(GetMinuteStartTimestampUTC(NOON_UTC + 59)).toBe(NOON_UTC);
  });

  it("GetMinuteStartNowTimestampUTC floors the current time to the minute", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:45Z"));
    expect(GetMinuteStartNowTimestampUTC()).toBe(NOON_UTC);
  });

  it("GetDayStartTimestampUTC returns midnight UTC of the timestamp's day", () => {
    expect(GetDayStartTimestampUTC(NOON_UTC)).toBe(DAY_START);
    expect(GetDayStartTimestampUTC(DAY_START + 12 * 3600 + 61)).toBe(DAY_START);
  });

  it("DurationInMinutes floors the difference to whole minutes", () => {
    expect(DurationInMinutes(0, 600)).toBe(10);
    expect(DurationInMinutes(0, 59)).toBe(0);
    expect(DurationInMinutes(DAY_START, NOON_UTC)).toBe(720);
  });

  it("GetDayStartWithOffset shifts the UTC day start by positive offsets", () => {
    // 330 minutes = UTC+5:30 (e.g. IST)
    expect(GetDayStartWithOffset(NOON_UTC, 330)).toBe(DAY_START + 330 * 60);
    expect(GetDayStartWithOffset(NOON_UTC, 0)).toBe(DAY_START);
  });

  it("GetDayStartWithOffset moves to the next day for negative offsets", () => {
    expect(GetDayStartWithOffset(NOON_UTC, -330)).toBe(DAY_START + 86400 - 330 * 60);
  });

  it("BeginningOfDay returns midnight in the given timezone", () => {
    const date = new Date("2026-01-15T12:00:00Z");
    expect(BeginningOfDay({ date, timeZone: "UTC" })).toBe(DAY_START);
    // Midnight in New York (UTC-5 in January) is 05:00 UTC
    expect(BeginningOfDay({ date, timeZone: "America/New_York" })).toBe(DAY_START + 5 * 3600);
  });

  it("BeginningOfMinute strips seconds", () => {
    const date = new Date("2026-01-15T12:00:45Z");
    expect(BeginningOfMinute({ date, timeZone: "UTC" })).toBe(NOON_UTC);
  });
});

describe("ParseUptime", () => {
  it("returns '-' when there is no data", () => {
    expect(ParseUptime(0, 0)).toBe("-");
  });

  it("returns '0' when nothing is up", () => {
    expect(ParseUptime(0, 10)).toBe("0");
  });

  it("returns whole numbers without decimals", () => {
    expect(ParseUptime(10, 10)).toBe("100");
    expect(ParseUptime(5, 10)).toBe("50");
  });

  it("keeps 4 decimal places and strips trailing zeros", () => {
    expect(ParseUptime(1, 3)).toBe("33.3333");
    expect(ParseUptime(2, 3)).toBe("66.6667");
    expect(ParseUptime(1, 8)).toBe("12.5");
    expect(ParseUptime(999, 1000)).toBe("99.9");
  });
});

describe("ParsePercentage / UnparsePercentage", () => {
  it("formats numbers as percentage strings", () => {
    expect(ParsePercentage(NaN)).toBe("-");
    expect(ParsePercentage(0)).toBe("0");
    expect(ParsePercentage(100)).toBe("100");
    expect(ParsePercentage(99.9)).toBe("99.9000");
  });

  it("parses percentage strings back to numbers", () => {
    expect(UnparsePercentage("99.9")).toBe(99.9);
    expect(UnparsePercentage("0")).toBe(0);
    expect(Number.isNaN(UnparsePercentage("-"))).toBe(true);
  });
});

describe("IsValidUptimeFormula", () => {
  it("accepts single variables and operator chains", () => {
    expect(IsValidUptimeFormula("up")).toBe(true);
    expect(IsValidUptimeFormula("up + down")).toBe(true);
    expect(IsValidUptimeFormula("up+down+degraded+maintenance")).toBe(true);
    expect(IsValidUptimeFormula("up - down * maintenance / degraded")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(IsValidUptimeFormula("UP + Maintenance")).toBe(true);
  });

  it("rejects malformed formulas", () => {
    expect(IsValidUptimeFormula("")).toBe(false);
    expect(IsValidUptimeFormula("   ")).toBe(false);
    expect(IsValidUptimeFormula("up +")).toBe(false);
    expect(IsValidUptimeFormula("+ up")).toBe(false);
    expect(IsValidUptimeFormula("banana + up")).toBe(false);
    expect(IsValidUptimeFormula("up ** down")).toBe(false);
    expect(IsValidUptimeFormula("up down")).toBe(false);
    expect(IsValidUptimeFormula("42")).toBe(false);
  });
});

describe("UptimeCalculator", () => {
  const day = (overrides: Partial<TimestampStatusCount>): TimestampStatusCount => ({
    ts: 0,
    countOfUp: 0,
    countOfDown: 0,
    countOfDegraded: 0,
    countOfMaintenance: 0,
    avgLatency: 0,
    maxLatency: 0,
    minLatency: 0,
    ...overrides,
  });

  it("computes uptime and latency aggregates with the default formulas", () => {
    // Defaults (global-constants): numerator "up + maintenance + degraded",
    // denominator "up + down + degraded + maintenance"
    const data = [
      day({ countOfUp: 30, countOfDown: 10, avgLatency: 100, maxLatency: 150, minLatency: 50 }),
      day({ countOfUp: 50, countOfDegraded: 10, avgLatency: 200, maxLatency: 300, minLatency: 80 }),
    ];
    expect(UptimeCalculator(data)).toEqual({
      uptime: "90", // (80 up + 0 maintenance + 10 degraded) / 100 total
      avgLatency: "150ms", // (100 + 200) / 2
      maxLatency: "300ms",
      minLatency: "50ms",
    });
  });

  it("supports a custom numerator formula", () => {
    const data = [day({ countOfUp: 30, countOfDown: 10 }), day({ countOfUp: 50, countOfDegraded: 10 })];
    expect(UptimeCalculator(data, "up").uptime).toBe("80");
  });

  it("falls back to the default formula when the custom one is invalid", () => {
    const data = [day({ countOfUp: 30, countOfDown: 10 }), day({ countOfUp: 50, countOfDegraded: 10 })];
    expect(UptimeCalculator(data, "banana + up").uptime).toBe("90");
  });

  it("returns '-' uptime and empty latencies for no data", () => {
    expect(UptimeCalculator([])).toEqual({
      uptime: "-",
      avgLatency: "",
      maxLatency: "",
      minLatency: "",
    });
  });

  it("only counts entries with a positive avgLatency toward the average", () => {
    const data = [
      day({ countOfUp: 10, avgLatency: 0 }),
      day({ countOfUp: 10, avgLatency: 100, maxLatency: 100, minLatency: 100 }),
    ];
    const result = UptimeCalculator(data);
    expect(result.uptime).toBe("100");
    expect(result.avgLatency).toBe("100ms"); // (0 + 100) / 1 entry with latency > 0
  });
});

describe("ValidateIpAddress", () => {
  it("classifies IPv4, IPv6, domain names, and invalid input", () => {
    expect(ValidateIpAddress("192.168.1.1")).toBe("IPv4");
    expect(ValidateIpAddress("8.8.8.8")).toBe("IPv4");
    expect(ValidateIpAddress("2001:0db8:85a3:0000:0000:8a2e:0370:7334")).toBe("IPv6");
    expect(ValidateIpAddress("example.com")).toBe("Domain Name");
    expect(ValidateIpAddress("kener.ing")).toBe("Domain Name");
    expect(ValidateIpAddress("not valid")).toBe("Invalid");
  });

  it("documents quirks: permissive IPv4 octets, no shortened IPv6", () => {
    // The regex does not range-check octets:
    expect(ValidateIpAddress("999.999.999.999")).toBe("IPv4");
    // Only full-form IPv6 is recognized:
    expect(ValidateIpAddress("::1")).toBe("Invalid");
  });
});

describe("host / nameserver / URL / method validators", () => {
  it("IsValidHost accepts dotted domains with a TLD", () => {
    expect(IsValidHost("example.com")).toBe(true);
    expect(IsValidHost("sub.domain.co.uk")).toBe(true);
    expect(IsValidHost("my-site.example.org")).toBe(true);
    expect(IsValidHost("localhost")).toBe(false);
    expect(IsValidHost("-bad.com")).toBe(false);
    expect(IsValidHost("")).toBe(false);
  });

  it("IsValidNameServer accepts only dotted-quad IPs", () => {
    expect(IsValidNameServer("8.8.8.8")).toBe(true);
    expect(IsValidNameServer("example.com")).toBe(false);
    expect(IsValidNameServer("8.8.8")).toBe(false);
  });

  it("IsValidURL requires http(s) and no spaces", () => {
    expect(IsValidURL("https://example.com")).toBe(true);
    expect(IsValidURL("http://example.com/path?q=1")).toBe(true);
    expect(IsValidURL("ftp://example.com")).toBe(false);
    expect(IsValidURL("https://exa mple.com")).toBe(false);
  });

  it("ValidateURL parses with the URL constructor and allows only http(s)", () => {
    expect(ValidateURL("https://example.com")).toBe(true);
    expect(ValidateURL("http://localhost:3000")).toBe(true);
    expect(ValidateURL("ftp://example.com")).toBe(false);
    expect(ValidateURL("javascript:alert(1)")).toBe(false);
    expect(ValidateURL("not a url")).toBe(false);
  });

  it("IsValidHTTPMethod is uppercase-only", () => {
    expect(IsValidHTTPMethod("GET")).toBe(true);
    expect(IsValidHTTPMethod("PATCH")).toBe(true);
    expect(IsValidHTTPMethod("get")).toBe(false);
    expect(IsValidHTTPMethod("FETCH")).toBe(false);
  });

  it("IsStringURLSafe allows unreserved URL characters only", () => {
    expect(IsStringURLSafe("abc-123_~.")).toBe(true);
    expect(IsStringURLSafe("a b")).toBe(false);
    expect(IsStringURLSafe("a/b")).toBe(false);
  });
});

describe("ValidateEmail", () => {
  it("accepts common address shapes", () => {
    expect(ValidateEmail("user@example.com")).toBe(true);
    expect(ValidateEmail("first.last@sub.example.co")).toBe(true);
    expect(ValidateEmail("user+tag@example.com")).toBe(true);
  });

  it("rejects malformed addresses", () => {
    expect(ValidateEmail("no-at.example.com")).toBe(false);
    expect(ValidateEmail("user@")).toBe(false);
    expect(ValidateEmail("user@nodot")).toBe(false);
    expect(ValidateEmail("@example.com")).toBe(false);
  });
});

describe("string helpers", () => {
  it("MaskString masks everything but the last 4 characters", () => {
    expect(MaskString("secret123")).toBe("*****t123");
    expect(MaskString("abcd")).toBe("****");
    expect(MaskString("ab")).toBe("**");
    expect(MaskString("")).toBe("");
  });

  it("HashString returns the sha256 hex digest", () => {
    expect(HashString("hello")).toBe("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
  });

  it("GetWordsStartingWithDollar extracts $-prefixed words", () => {
    expect(GetWordsStartingWithDollar("run $FOO with $BAR_2")).toEqual(["$FOO", "$BAR_2"]);
    expect(GetWordsStartingWithDollar("nothing here")).toEqual([]);
  });

  it("ReplaceAllOccurrences replaces every occurrence of a $-token", () => {
    expect(ReplaceAllOccurrences("a $X b $X", "$X", "y")).toBe("a y b y");
  });

  it("checkIfDuplicateExists detects duplicates", () => {
    expect(checkIfDuplicateExists([1, 2, 2])).toBe(true);
    expect(checkIfDuplicateExists(["a", "b"])).toBe(false);
  });
});

describe("GetRequiredSecrets", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("resolves $-tokens that exist in the environment", () => {
    vi.stubEnv("KENER_TEST_SECRET", "s3cret");
    expect(GetRequiredSecrets("token: $KENER_TEST_SECRET")).toEqual([
      { find: "$KENER_TEST_SECRET", replace: "s3cret" },
    ]);
  });

  it("ignores tokens with no matching environment variable", () => {
    expect(GetRequiredSecrets("token: $KENER_TEST_DEFINITELY_UNSET_VAR")).toEqual([]);
  });
});

describe("ValidateMonitorAlerts", () => {
  beforeEach(() => {
    // The function console.logs every rejection reason; keep test output clean.
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const validAlert = { triggers: [1], failureThreshold: 1, successThreshold: 2 };

  it("accepts DOWN and/or DEGRADED alerts with triggers and integer thresholds", () => {
    expect(ValidateMonitorAlerts({ DOWN: validAlert })).toBe(true);
    expect(ValidateMonitorAlerts({ DOWN: validAlert, DEGRADED: validAlert })).toBe(true);
  });

  it("rejects missing/empty/unknown-key alert objects", () => {
    expect(ValidateMonitorAlerts(null)).toBe(false);
    expect(ValidateMonitorAlerts({})).toBe(false);
    expect(ValidateMonitorAlerts({ UP: validAlert } as never)).toBe(false);
  });

  it("rejects missing or empty triggers", () => {
    expect(ValidateMonitorAlerts({ DOWN: { failureThreshold: 1, successThreshold: 1 } })).toBe(false);
    expect(ValidateMonitorAlerts({ DOWN: { ...validAlert, triggers: [] } })).toBe(false);
  });

  it("rejects missing, non-integer, or non-positive thresholds", () => {
    expect(ValidateMonitorAlerts({ DOWN: { triggers: [1] } })).toBe(false);
    expect(ValidateMonitorAlerts({ DOWN: { ...validAlert, failureThreshold: 1.5 } })).toBe(false);
    expect(ValidateMonitorAlerts({ DOWN: { ...validAlert, successThreshold: 0 } })).toBe(false);
  });
});
