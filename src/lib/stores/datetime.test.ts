import { describe, expect, it } from "vitest";
import { formatDateTz } from "./datetime";

// Alert Logs persist created_at / updated_at as SQLite UTC datetimes without a
// timezone suffix ("YYYY-MM-DD HH:mm:ss"). formatDateTz must treat those as UTC
// and convert into the selected timezone — the same contract Monitoring Data
// already has via Unix timestamps. See https://github.com/rajnandan1/kener/issues/813
const ALERT_TRIGGERED_UTC = "2026-08-20 04:02:00";

describe("formatDateTz", () => {
  it("treats offset-less DB datetimes as UTC and converts to the selected timezone", () => {
    expect(formatDateTz(ALERT_TRIGGERED_UTC, "yyyy-MM-dd HH:mm:ss", "UTC")).toBe("2026-08-20 04:02:00");
    expect(formatDateTz(ALERT_TRIGGERED_UTC, "yyyy-MM-dd HH:mm:ss", "Asia/Shanghai")).toBe("2026-08-20 12:02:00");
  });

  it("keeps ISO timestamps with a Z suffix as the same UTC instant", () => {
    expect(formatDateTz("2026-08-20T04:02:00.000Z", "yyyy-MM-dd HH:mm:ss", "Asia/Shanghai")).toBe(
      "2026-08-20 12:02:00",
    );
  });

  it("converts Unix seconds the same way Monitoring Data does", () => {
    const unixSeconds = Date.parse("2026-08-20T04:02:00.000Z") / 1000;
    expect(formatDateTz(unixSeconds, "yyyy-MM-dd HH:mm:ss", "Asia/Shanghai")).toBe("2026-08-20 12:02:00");
  });
});
