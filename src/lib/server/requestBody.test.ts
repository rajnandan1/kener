import { describe, expect, it } from "vitest";
import spec from "../../../static/api-references/v4.json";
import { MONITOR_TYPES } from "$lib/types/monitor";
import { findBodyError, readRequestBody, type Schema } from "./requestBody";

const nullableString: Schema = { oneOf: [{ type: "string" }, { type: "null" }] };
const windowOrStatus: Schema = {
  oneOf: [
    {
      type: "object",
      required: ["start_date_time", "end_date_time"],
      properties: { start_date_time: { type: "integer" }, end_date_time: { type: "integer" } },
    },
    { type: "object", required: ["status"], properties: { status: { type: "string", enum: ["COMPLETED"] } } },
  ],
};

describe("findBodyError", () => {
  it.each([
    [{ type: "object" }, null, "The request body must be an object"],
    [{ type: "object", properties: { n: { type: "integer" } } }, { n: 1.5 }, "n must be an integer"],
    [{ type: "object", properties: { s: nullableString } }, { s: 1 }, "s must be a string or null"],
    [{ type: "object", properties: { s: { type: "string", enum: ["A", "B"] } } }, { s: "C" }, "s must be one of: A, B"],
    [
      { type: "object", properties: { list: { type: "array", items: { type: "string" } } } },
      { list: ["a", 2] },
      "list[1] must be a string",
    ],
    [{ type: "object", required: ["tag"] }, {}, "tag is required"],
    [windowOrStatus, { start_date_time: "x", end_date_time: 1 }, "start_date_time must be an integer"],
    [windowOrStatus, { status: "OPEN" }, "status must be one of: COMPLETED"],
    [windowOrStatus, [], "The request body must be an object"],
  ] as [Schema, unknown, string][])("reports %j with %j as %s", (schema, value, message) => {
    expect(findBodyError(schema, value)).toBe(message);
  });

  it.each([
    [{ type: "object", properties: { s: nullableString } }, { s: null }],
    [{ type: "number" }, 1.5],
    [{ type: "object", properties: { s: { type: "string" } } }, { other: [1] }],
    [windowOrStatus, { status: "COMPLETED" }],
  ] as [Schema, unknown][])("accepts %j with %j", (schema, value) => {
    expect(findBodyError(schema, value)).toBeUndefined();
  });
});

describe("readRequestBody", () => {
  const read = (raw: string) =>
    readRequestBody(new Request("http://localhost", { method: "POST", body: raw }), "POST /api/v4/monitors");

  it("returns the parsed body when it matches the spec", async () => {
    expect(await read('{"tag":"api","name":"API"}')).toEqual({ tag: "api", name: "API" });
  });

  it.each([
    ["{", "Invalid JSON body"],
    ['{"tag":"api","name":"API","description":["x"]}', "description must be a string or null"],
  ])("returns 400 BAD_REQUEST for %s", async (raw, message) => {
    const response = (await read(raw)) as Response;

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: { code: "BAD_REQUEST", message } });
  });
});

it("the spec allows the same monitor types as MONITOR_TYPES", () => {
  for (const name of ["CreateMonitorRequest", "UpdateMonitorRequest"] as const) {
    expect(spec.components.schemas[name].properties.monitor_type.enum).toEqual([...MONITOR_TYPES]);
  }
});
