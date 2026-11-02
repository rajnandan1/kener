import { json } from "@sveltejs/kit";
import spec from "../../../static/api-references/v4.json";

export interface Schema {
  type?: string | string[];
  enum?: unknown[];
  required?: string[];
  properties?: Record<string, Schema>;
  items?: Schema;
  oneOf?: Schema[];
  $ref?: string;
}

type Operation = { requestBody: { content: { "application/json": { schema: Schema } } } };
const paths = spec.paths as unknown as Record<string, Record<string, Operation>>;
const schemas = spec.components.schemas as unknown as Record<string, Schema>;

const resolveRef = (schema: Schema): Schema =>
  schema.$ref ? resolveRef(schemas[schema.$ref.split("/").pop()!]) : schema;

const typesOf = (schema: Schema): string[] => {
  const s = resolveRef(schema);
  return s.oneOf ? s.oneOf.flatMap(typesOf) : [s.type ?? []].flat();
};

const isType = (value: unknown, type: string): boolean => {
  if (type === "null") return value === null;
  if (type === "array") return Array.isArray(value);
  if (type === "object") return typeof value === "object" && value !== null && !Array.isArray(value);
  if (type === "integer") return Number.isInteger(value);
  return typeof value === type;
};

const typeError = (name: string, types: string[]): string =>
  `${name} must be ${[...new Set(types)].map((t) => (t === "null" ? t : /^[aeiou]/.test(t) ? `an ${t}` : `a ${t}`)).join(" or ")}`;

/** Checks type, enum, required, properties, items and oneOf. Value rules such as patterns stay in the controllers. */
export function findBodyError(schema: Schema, value: unknown, path = ""): string | undefined {
  const s = resolveRef(schema);
  const name = path || "The request body";
  if (s.oneOf) {
    const errors = s.oneOf.map((branch) => findBodyError(branch, value, path));
    if (errors.includes(undefined)) return undefined;
    const types = typesOf(s);
    if (!types.some((type) => isType(value, type))) return typeError(name, types);
    return errors.find((error) => !error!.endsWith(" is required")) ?? errors[0];
  }
  const types = [s.type ?? []].flat();
  if (types.length > 0 && !types.some((type) => isType(value, type))) return typeError(name, types);
  if (s.enum && !s.enum.includes(value)) return `${name} must be one of: ${s.enum.join(", ")}`;
  if (Array.isArray(value) && s.items) {
    for (const [index, item] of value.entries()) {
      const error = findBodyError(s.items, item, `${path}[${index}]`);
      if (error) return error;
    }
  }
  if (isType(value, "object")) {
    const record = value as Record<string, unknown>;
    const field = (key: string) => (path ? `${path}.${key}` : key);
    const missing = s.required?.find((key) => record[key] === undefined);
    if (missing) return `${field(missing)} is required`;
    for (const [key, property] of Object.entries(s.properties ?? {})) {
      if (record[key] === undefined) continue;
      const error = findBodyError(property, record[key], field(key));
      if (error) return error;
    }
  }
  return undefined;
}

/** Parses the JSON body and checks it against the request schema of `operation` (for example "POST /api/v4/monitors") in static/api-references/v4.json. */
export async function readRequestBody<T>(request: Request, operation: string): Promise<T | Response> {
  const [method, path] = operation.split(" ");
  const schema = paths[path][method.toLowerCase()].requestBody.content["application/json"].schema;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: { code: "BAD_REQUEST", message: "Invalid JSON body" } }, { status: 400 });
  }
  const message = findBodyError(schema, body);
  return message ? json({ error: { code: "BAD_REQUEST", message } }, { status: 400 }) : (body as T);
}
