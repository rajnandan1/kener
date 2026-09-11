import type { APIHandler } from "$lib/server/types/api-server";

interface RouteHandlers {
  get?: APIHandler;
  post?: APIHandler;
  put?: APIHandler;
  delete?: APIHandler;
}

// Auto-import all handler files at build time. Scoped to the four known
// method filenames (not a bare "./*/*.ts") so a stray file dropped into an
// action folder — e.g. a co-located post.test.ts — never gets eagerly
// imported into the production bundle.
const modules = import.meta.glob<{ default: APIHandler }>(
  ["./*/get.ts", "./*/post.ts", "./*/put.ts", "./*/delete.ts"],
  { eager: true },
);

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
