import { json, type Handle, type RequestEvent } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import { VerifyAPIKey } from "$lib/server/controllers/apiController";
import db from "$lib/server/db/db";
import type { UnauthorizedResponse, NotFoundResponse } from "$lib/types/api";
import { GetMonitorsParsed } from "$lib/server/controllers/monitorsController";
import GC from "$lib/global-constants";
import { InstallEnvProxy } from "$lib/server/proxy";

// Dev runs the SvelteKit server and the scheduler as separate processes; each installs once.
InstallEnvProxy();

const API_ROUTE_GROUP = "/(api)/";
const API_PATH_PREFIX = "/api/";
const INTEGER_ID = /^\d+$/;

// SvelteKit matches routes on the percent-decoded path, so "/%61pi/v4/monitors" reaches an API route
// while event.url.pathname still reads "/%61pi/...". The raw path decides only when no route matched.
function isApiRequest(event: RequestEvent): boolean {
  return event.route.id?.startsWith(API_ROUTE_GROUP) ?? event.url.pathname.startsWith(API_PATH_PREFIX);
}

function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(" ");
  if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
    return parts[1];
  }
  return null;
}

function unauthorized(message: string): Response {
  const body: UnauthorizedResponse = { error: { code: "UNAUTHORIZED", message } };
  return json(body, { status: 401 });
}

function notFound(message: string): Response {
  const body: NotFoundResponse = { error: { code: "NOT_FOUND", message } };
  return json(body, { status: 404 });
}

// Content types that indicate a form submission (mirrors SvelteKit's internal CSRF check scope)
const FORM_CONTENT_TYPES = ["application/x-www-form-urlencoded", "multipart/form-data", "text/plain"];

function isFormContentType(request: Request): boolean {
  const type = request.headers.get("content-type")?.split(";", 1)[0].trim()?.toLowerCase() ?? "";
  return FORM_CONTENT_TYPES.includes(type);
}

// Custom CSRF handler: validates Origin when present, allows requests when absent.
// When Origin is absent (e.g. Referrer-Policy: no-referrer), security relies on
// SameSite=Lax cookies which prevent cross-site POST from carrying auth cookies.
const csrfHandle: Handle = async ({ event, resolve }) => {
  const { request } = event;

  if (
    isFormContentType(request) &&
    (request.method === "POST" || request.method === "PUT" || request.method === "PATCH" || request.method === "DELETE")
  ) {
    const requestOrigin = request.headers.get("origin");
    if (requestOrigin && requestOrigin !== "null") {
      const requestHost = new URL(requestOrigin).host;
      const expectedHost = event.url.host;
      if (requestHost !== expectedHost) {
        return new Response(`Cross-site ${request.method} form submissions are forbidden`, { status: 403 });
      }
    }
  }

  return resolve(event);
};

const apiAuthHandle: Handle = async ({ event, resolve }) => {
  if (isApiRequest(event)) {
    const token = extractBearerToken(event.request.headers.get("authorization"));
    if (!token) return unauthorized("Missing or invalid authorization header");
    if (!(await VerifyAPIKey(token))) return unauthorized("Invalid API key");

    // API consumers must always get JSON; without this, an /api/ path with no
    // matching route falls through to SvelteKit's HTML error page
    if (event.route.id === null) return notFound(`No API route matches '${event.url.pathname}'`);

    const { monitor_tag, incident_id, maintenance_id, page_path } = event.params;

    if (monitor_tag !== undefined) {
      const [monitor] = await GetMonitorsParsed({ tag: monitor_tag });
      if (!monitor) return notFound(`Monitor with tag '${monitor_tag}' not found`);
      event.locals.monitor = monitor;
    }

    if (incident_id !== undefined) {
      const incident = INTEGER_ID.test(incident_id) ? await db.getIncidentById(Number(incident_id)) : undefined;
      if (!incident) return notFound(`Incident with id '${incident_id}' not found`);
      event.locals.incident = incident;
    }

    if (maintenance_id !== undefined) {
      const maintenance = INTEGER_ID.test(maintenance_id)
        ? await db.getMaintenanceById(Number(maintenance_id))
        : undefined;
      if (!maintenance) return notFound(`Maintenance with id '${maintenance_id}' not found`);
      event.locals.maintenance = maintenance;
    }

    if (page_path !== undefined) {
      // The home page has an empty page_path, unreachable as a URL segment;
      // the ~home token addresses it instead
      const page = await db.getPageByPath(page_path === GC.HOME_PAGE_TOKEN ? "" : page_path);
      if (!page) return notFound(`Page with path '${page_path}' not found`);
      event.locals.page = page;
    }
  }

  const response = await resolve(event);
  response.headers.delete("Link");
  return response;
};

// A signed-in response can include hidden monitors, so a shared cache (CDN) must not store it.
const privateCacheHandle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  if (event.cookies.get("kener-user") && !response.headers.has("cache-control")) {
    response.headers.set("cache-control", "private");
  }
  return response;
};

export const handle = sequence(csrfHandle, privateCacheHandle, apiAuthHandle);
