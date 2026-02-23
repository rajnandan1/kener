/**
 * Server-side URL resolver that uses KENER_BASE_PATH environment variable
 * Works in both SvelteKit and Node scheduler contexts
 *
 * @param path - The route path (e.g., "/api/monitor") or absolute URL
 * @param params - Optional parameters for dynamic route segments (e.g., { slug: "hello" })
 * @returns The resolved URL with base path, or the original URL if it's absolute
 *
 * @example
 * ```ts
 * // Using a static path
 * serverResolve("/dashboard-apis/monitor-bar")
 * // Returns: "/status/dashboard-apis/monitor-bar" (if KENER_BASE_PATH=/status)
 *
 * // Using dynamic route with params
 * serverResolve("/blog/[slug]", { slug: "hello-world" })
 * // Returns: "/status/blog/hello-world"
 *
 * // Using an absolute URL (returns as-is)
 * serverResolve("https://example.com/api")
 * // Returns: "https://example.com/api"
 * ```
 */
function serverResolve(path: string, params?: Record<string, string>): string {
  // If path is an absolute URL, return it as-is
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  // Get base path from environment variable
  const basePath = process.env.KENER_BASE_PATH || "";

  // Replace route parameters if provided
  let resolvedPath = path;
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      resolvedPath = resolvedPath.replace(`[${key}]`, value);
    }
  }

  // Ensure path starts with /
  if (!resolvedPath.startsWith("/")) {
    resolvedPath = "/" + resolvedPath;
  }

  // Combine base path with resolved path
  // Ensure no double slashes
  const fullPath = basePath + resolvedPath;
  return fullPath.replace(/\/+/g, "/");
}

export default serverResolve;
