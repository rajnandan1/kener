# Kener API Development Instructions

This document provides guidelines for creating new API endpoints in Kener. Follow these patterns to maintain consistency across all APIs.

## API Architecture Overview

### Directory Structure
```
src/routes/(api)/api/
├── {resource}/
│   ├── +server.ts              # GET (list), POST (create)
│   └── [{resource}_id]/
│       ├── +server.ts          # GET, PATCH, DELETE (single resource)
│       └── {sub-resource}/
│           ├── +server.ts      # GET (list), POST (create)
│           └── [{sub_id}]/
│               └── +server.ts  # GET, PATCH, DELETE (single sub-resource)
```

### Key Files
- **Types**: `src/lib/types/api.ts` - All API request/response types (snake_case)
- **Middleware**: `src/hooks.server.ts` - Authentication and resource validation
- **App Locals**: `src/app.d.ts` - TypeScript declarations for `event.locals`
- **Repository**: `src/lib/server/db/repositories/*.ts` - Database operations
- **DbImpl**: `src/lib/server/db/dbimpl.ts` - Bindings for repository methods

## Naming Conventions

### Use snake_case for API payloads
```typescript
// ✅ Correct
interface CreateMonitorRequest {
  monitor_tag: string;
  start_date_time: number;
  duration_seconds: number;
}

// ❌ Wrong
interface CreateMonitorRequest {
  monitorTag: string;
  startDateTime: number;
  durationSeconds: number;
}
```

### Type Naming Pattern
```typescript
// List response
interface Get{Resource}sListResponse {
  {resources}: {Resource}Response[];
}

// Single resource response
interface Get{Resource}Response {
  {resource}: {Resource}DetailResponse;
}

// Create request/response
interface Create{Resource}Request { ... }
interface Create{Resource}Response {
  {resource}: {Resource}Response;
}

// Update request/response
interface Update{Resource}Request { ... }
interface Update{Resource}Response {
  {resource}: {Resource}Response;
}

// Delete response
interface Delete{Resource}Response {
  message: string;
}

// Error responses (reuse existing)
interface BadRequestResponse { error: { code: string; message: string; } }
interface NotFoundResponse { error: { code: string; message: string; } }
interface UnauthorizedResponse { error: { code: string; message: string; } }
```

## Middleware Pattern

### 1. Add Route Regex Pattern in `hooks.server.ts`
```typescript
const RESOURCE_ID_ROUTE_REGEX = /^\/api\/resources\/(\d+)/;

function extractResourceId(pathname: string): number | null {
  const match = pathname.match(RESOURCE_ID_ROUTE_REGEX);
  return match ? parseInt(match[1], 10) : null;
}
```

### 2. Add Validation Block in `handle()` Function
```typescript
// Validate resource_id exists for /api/resources/:resource_id/* routes
const resourceId = extractResourceId(pathname);
if (resourceId) {
  const resource = await db.getResourceById(resourceId);
  if (!resource) {
    const errorResponse: NotFoundResponse = {
      error: {
        code: "NOT_FOUND",
        message: `Resource with id '${resourceId}' not found`,
      },
    };
    return json(errorResponse, { status: 404 });
  }
  // Store resource in locals for use in endpoints
  event.locals.resource = resource;
}
```

### 3. Declare in `app.d.ts`
```typescript
interface Locals {
  // Set by hooks.server.ts for /api/resources/:resource_id/* routes
  resource?: import("$lib/server/types/db").ResourceRecord;
}
```

## Endpoint Implementation Pattern

### GET (List)
```typescript
import { json, type RequestHandler } from "@sveltejs/kit";
import db from "$lib/server/db/db";
import type { GetResourcesListResponse, ResourceResponse } from "$lib/types/api";

function formatDateToISO(date: Date | string): string {
  if (date instanceof Date) return date.toISOString();
  const parsed = new Date(date.replace(" ", "T") + "Z");
  return parsed.toISOString();
}

export const GET: RequestHandler = async ({ url }) => {
  // Parse query params for filtering
  const statusParam = url.searchParams.get("status");
  const pageParam = url.searchParams.get("page");
  const limitParam = url.searchParams.get("limit");

  const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1;
  const limit = limitParam ? Math.min(100, Math.max(1, parseInt(limitParam, 10) || 20)) : 20;

  // Build filter
  const filter: { status?: string } = {};
  if (statusParam) filter.status = statusParam;

  // Query database
  const rawResources = await db.getResourcesPaginated(page, limit, filter);

  // Transform to response format
  const resources: ResourceResponse[] = rawResources.map((r) => ({
    id: r.id,
    name: r.name,
    created_at: formatDateToISO(r.created_at),
    updated_at: formatDateToISO(r.updated_at),
  }));

  const response: GetResourcesListResponse = { resources };
  return json(response);
};
```

### POST (Create)
```typescript
export const POST: RequestHandler = async ({ request }) => {
  let body: CreateResourceRequest;

  try {
    body = await request.json();
  } catch {
    const errorResponse: BadRequestResponse = {
      error: { code: "BAD_REQUEST", message: "Invalid JSON body" },
    };
    return json(errorResponse, { status: 400 });
  }

  // Validate required fields
  if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
    const errorResponse: BadRequestResponse = {
      error: { code: "BAD_REQUEST", message: "name is required and must be a non-empty string" },
    };
    return json(errorResponse, { status: 400 });
  }

  // Normalize timestamps using helper
  const normalizedTimestamp = GetMinuteStartTimestampUTC(body.start_date_time);

  // Create resource
  const created = await db.createResource({
    name: body.name.trim(),
    start_date_time: normalizedTimestamp,
  });

  // Build response
  const resourceResponse = await buildResourceResponse(created.id);
  const response: CreateResourceResponse = { resource: resourceResponse };
  return json(response, { status: 201 });
};
```

### GET (Single) - Uses Middleware
```typescript
export const GET: RequestHandler = async ({ locals }) => {
  // Resource is validated by middleware and available in locals
  const resource = locals.resource!;

  const resourceResponse = await buildResourceResponse(resource.id);
  const response: GetResourceResponse = { resource: resourceResponse };
  return json(response);
};
```

### PATCH (Update) - Uses Middleware
```typescript
export const PATCH: RequestHandler = async ({ locals, request }) => {
  const existingResource = locals.resource!;

  let body: UpdateResourceRequest;
  try {
    body = await request.json();
  } catch {
    return json({ error: { code: "BAD_REQUEST", message: "Invalid JSON body" } }, { status: 400 });
  }

  // Validate fields if provided
  if (body.status !== undefined && !["ACTIVE", "INACTIVE"].includes(body.status)) {
    return json({ error: { code: "BAD_REQUEST", message: "status must be 'ACTIVE' or 'INACTIVE'" } }, { status: 400 });
  }

  // Build update data - only include fields present in request
  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) updateData.name = body.name.trim();
  if (body.status !== undefined) updateData.status = body.status;

  // Update if there's data to update
  if (Object.keys(updateData).length > 0) {
    await db.updateResource(existingResource.id, updateData);
  }

  const resourceResponse = await buildResourceResponse(existingResource.id);
  const response: UpdateResourceResponse = { resource: resourceResponse };
  return json(response);
};
```

### DELETE - Uses Middleware
```typescript
export const DELETE: RequestHandler = async ({ locals }) => {
  const resource = locals.resource!;

  // Delete related records first (cascade)
  await db.deleteResourceRelatedRecords(resource.id);
  
  // Delete the resource itself
  await db.deleteResource(resource.id);

  const response: DeleteResourceResponse = {
    message: `Resource with id '${resource.id}' deleted successfully`,
  };
  return json(response);
};
```

## Timestamp Handling

### Always normalize timestamps
```typescript
import { GetMinuteStartTimestampUTC, GetNowTimestampUTC } from "$lib/server/tool";

// For user-provided timestamps - normalize to minute start
const normalizedTs = GetMinuteStartTimestampUTC(body.start_date_time);

// For current time (when timestamp is optional)
const now = GetNowTimestampUTC();

// For optional timestamp with fallback
const timestamp = body.timestamp !== undefined 
  ? GetMinuteStartTimestampUTC(body.timestamp) 
  : GetMinuteStartNowTimestampUTC();
```

## Validation Patterns

### Required Field Validation
```typescript
if (body.field === undefined || body.field === null) {
  return json({ error: { code: "BAD_REQUEST", message: "field is required" } }, { status: 400 });
}
```

### Type Validation
```typescript
if (typeof body.count !== "number" || isNaN(body.count) || body.count <= 0) {
  return json({ error: { code: "BAD_REQUEST", message: "count must be a positive number" } }, { status: 400 });
}
```

### Enum Validation
```typescript
const VALID_STATUSES = ["ACTIVE", "INACTIVE"];
if (body.status && !VALID_STATUSES.includes(body.status)) {
  return json({ 
    error: { code: "BAD_REQUEST", message: `status must be one of: ${VALID_STATUSES.join(", ")}` } 
  }, { status: 400 });
}
```

### Foreign Key Validation
```typescript
if (body.monitor_tag) {
  const monitor = await db.getMonitorByTag(body.monitor_tag);
  if (!monitor) {
    return json({ 
      error: { code: "BAD_REQUEST", message: `Monitor with tag '${body.monitor_tag}' not found` } 
    }, { status: 400 });
  }
}
```

### Array Validation
```typescript
if (body.items !== undefined) {
  if (!Array.isArray(body.items)) {
    return json({ error: { code: "BAD_REQUEST", message: "items must be an array" } }, { status: 400 });
  }
  
  for (const item of body.items) {
    if (!item.tag || typeof item.tag !== "string") {
      return json({ error: { code: "BAD_REQUEST", message: "Each item must have a valid tag" } }, { status: 400 });
    }
  }
}
```

## Adding Repository Methods

### 1. Add Method to Repository Class
```typescript
// In src/lib/server/db/repositories/{resource}.ts
async getResourcesWithDetails(options: {
  page: number;
  limit: number;
  filter?: { status?: string };
}): Promise<{ resources: ResourceRecord[]; total: number }> {
  // Implementation
}
```

### 2. Declare Method Type in DbImpl
```typescript
// In src/lib/server/db/dbimpl.ts - declarations section
getResourcesWithDetails!: ResourceRepository["getResourcesWithDetails"];
```

### 3. Bind Method in DbImpl Constructor
```typescript
// In src/lib/server/db/dbimpl.ts - bindResourceMethods()
this.getResourcesWithDetails = this.resources.getResourcesWithDetails.bind(this.resources);
```

## Common Imports
```typescript
import { json, type RequestHandler } from "@sveltejs/kit";
import db from "$lib/server/db/db";
import type {
  Get{Resource}Response,
  Create{Resource}Request,
  Create{Resource}Response,
  Update{Resource}Request,
  Update{Resource}Response,
  Delete{Resource}Response,
  BadRequestResponse,
  NotFoundResponse,
} from "$lib/types/api";
import { GetMinuteStartTimestampUTC, GetNowTimestampUTC } from "$lib/server/tool";
```

## Response Status Codes
- `200` - GET success, PATCH success, DELETE success
- `201` - POST success (resource created)
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (no/invalid token)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

## Testing with cURL
```bash
# List
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/resources

# Create
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Test","start_date_time":1735689600}' \
  http://localhost:3000/api/resources

# Get single
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/resources/1

# Update
curl -X PATCH -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Updated"}' \
  http://localhost:3000/api/resources/1

# Delete
curl -X DELETE -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/resources/1
```

## Checklist for New API

1. [ ] Define types in `src/lib/types/api.ts`
2. [ ] Add middleware validation in `src/hooks.server.ts` (if resource has ID routes)
3. [ ] Update `src/app.d.ts` with locals type
4. [ ] Create endpoint files in `src/routes/(api)/api/{resource}/`
5. [ ] Add repository methods if needed
6. [ ] Bind repository methods in DbImpl
7. [ ] Test all endpoints with cURL
