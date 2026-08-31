import { describe, expect, it, vi } from "vitest";
import { withSerializedSiteDataWrite } from "./site-data-lock.js";
import { GetDbType } from "../../tool.js";

vi.mock("../../tool.js", () => ({
  GetDbType: vi.fn(),
}));

const mockedGetDbType = vi.mocked(GetDbType);

describe("withSerializedSiteDataWrite", () => {
  it("takes a postgres advisory lock for the duration of the write", async () => {
    mockedGetDbType.mockReturnValue("postgresql");
    const raw = vi.fn(async () => undefined);
    const trx = { raw } as never;

    const result = await withSerializedSiteDataWrite(trx, async () => "ok");

    expect(result).toBe("ok");
    expect(raw).toHaveBeenCalledTimes(1);
    expect(raw).toHaveBeenCalledWith("select pg_advisory_xact_lock(hashtext(?))", ["kener:site_data_write"]);
  });

  it("acquires and releases a mysql named lock around the write", async () => {
    mockedGetDbType.mockReturnValue("mysql");
    const raw = vi.fn(async (sql: string) => {
      if (sql.includes("GET_LOCK")) return { rows: [{ locked: 1 }] };
      if (sql.includes("RELEASE_LOCK")) return { rows: [{ released: 1 }] };
      return undefined;
    });
    const trx = { raw } as never;

    const result = await withSerializedSiteDataWrite(trx, async () => "ok");

    expect(result).toBe("ok");
    expect(raw).toHaveBeenNthCalledWith(1, "select GET_LOCK(?, 10) as locked", ["kener:site_data_write"]);
    expect(raw).toHaveBeenNthCalledWith(2, "select RELEASE_LOCK(?) as released", ["kener:site_data_write"]);
  });
});
