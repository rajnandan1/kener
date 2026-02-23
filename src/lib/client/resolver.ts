// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ResolveFn = (...args: any[]) => string;

/**
 * Wrapper for SvelteKit's resolve function
 * @param resolve - The resolve function from $app/paths
 * @param path - The route path or route ID (e.g., "/blog/[slug]") or absolute URL
 * @param params - Optional parameters for dynamic route segments
 * @returns The resolved URL with base path, or the original URL if it's absolute
 *
 * @example
 * ```ts
 * // Using a static path
 * urlResolve(resolve, "/dashboard-apis/monitor-bar")
 *
 * // Using a dynamic route with params
 * urlResolve(resolve, "/blog/[slug]", { slug: "hello-world" })
 *
 * // Using an absolute URL (returns as-is)
 * urlResolve(resolve, "https://example.com/api")
 * ```
 */
export default function urlResolve(resolve: ResolveFn, path: string, params?: Record<string, string>): string {
  // If path is an absolute URL, return it as-is
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  if (params) {
    return resolve(path, params);
  }
  return resolve(path);
}
