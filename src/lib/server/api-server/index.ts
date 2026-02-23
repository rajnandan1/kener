import type { APIHandler } from "$lib/server/types/api-server";

interface RouteHandlers {
  get?: APIHandler;
  post?: APIHandler;
  put?: APIHandler;
  delete?: APIHandler;
}

// Auto-import all handler files at build time
const modules = import.meta.glob<{ default: APIHandler }>("./*/*.ts", { eager: true });

const routes: Record<string, RouteHandlers> = {};

// Build routes from file structure: ./action/method.ts
for (const path in modules) {
  const match = path.match(/^\.\/([^/]+)\/(get|post|put|delete)\.ts$/);
  if (match) {
    const [, action, method] = match;
    if (!routes[action]) routes[action] = {};
    routes[action][method as keyof RouteHandlers] = modules[path].default;
  }
}

export function getHandler(action: string, method: string): APIHandler | null {
  const route = routes[action];
  if (!route) return null;

  const handler = route[method.toLowerCase() as keyof RouteHandlers];
  return handler || null;
}
