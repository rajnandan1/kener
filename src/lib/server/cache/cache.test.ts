import { beforeEach, describe, expect, it, vi } from "vitest";

const mget = vi.fn();
const get = vi.fn();
const set = vi.fn();
const del = vi.fn();
const pipelineSet = vi.fn();
const pipelineExec = vi.fn();

vi.mock("../redisConnector.js", () => ({
  redisIOConnection: () => {
    const pipeline = {
      set: (...args: unknown[]) => {
        pipelineSet(...args);
        return pipeline;
      },
      exec: pipelineExec,
    };
    return { mget, get, set, del, pipeline: () => pipeline };
  },
}));

import { getCacheMany, setCacheMany } from "./cache.js";

describe("getCacheMany", () => {
  beforeEach(() => {
    mget.mockReset();
    pipelineSet.mockReset();
    pipelineExec.mockReset();
  });

  it("returns an empty array without calling Redis when there are no keys", async () => {
    await expect(getCacheMany([])).resolves.toEqual([]);
    expect(mget).not.toHaveBeenCalled();
  });

  it("prefixes keys and parses JSON, leaving misses and invalid payloads as null", async () => {
    mget.mockResolvedValue(['{"status":"UP"}', null, "not-json"]);
    const result = await getCacheMany(["a:last_status", "b:last_status", "c:last_status"]);
    expect(mget).toHaveBeenCalledWith(
      "kener:cache:a:last_status",
      "kener:cache:b:last_status",
      "kener:cache:c:last_status",
    );
    expect(result).toEqual([{ status: "UP" }, null, null]);
  });
});

describe("setCacheMany", () => {
  beforeEach(() => {
    pipelineSet.mockReset();
    pipelineExec.mockReset();
  });

  it("pipelines SET EX for each entry", async () => {
    await setCacheMany(
      [
        { key: "a", value: { x: 1 } },
        { key: "b", value: null },
      ],
      120,
    );
    expect(pipelineSet).toHaveBeenCalledWith("kener:cache:a", '{"x":1}', "EX", 120);
    expect(pipelineSet).toHaveBeenCalledWith("kener:cache:b", "null", "EX", 120);
    expect(pipelineExec).toHaveBeenCalledOnce();
  });

  it("no-ops when there are no entries", async () => {
    await setCacheMany([]);
    expect(pipelineSet).not.toHaveBeenCalled();
  });
});
