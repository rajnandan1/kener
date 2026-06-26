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

/**
 * Resolves a path to an absolute URL by prefixing the site URL.
 * Required for meta tags like og:image and twitter:image that need absolute URLs.
 * @param resolve - The resolve function from $app/paths
 * @param siteUrl - The site URL (e.g., "https://status.example.com")
 * @param path - The route path or absolute URL
 * @param params - Optional parameters for dynamic route segments
 * @returns An absolute URL, or the resolved relative URL if siteUrl is empty
 *
 * @example
 * ```ts
 * absoluteResolve(resolve, "https://status.example.com", "/uploads/preview.png")
 * // => "https://status.example.com/uploads/preview.png"
 * ```
 */
export function absoluteResolve(
  resolve: ResolveFn,
  siteUrl: string,
  path: string,
  params?: Record<string, string>
): string {
  // Normalize relative paths like "./assets/..." to "/assets/..." so the
  // final URL doesn't contain "/./" segments (crawlers don't normalize these)
  const normalizedPath = path.startsWith("./") ? path.slice(1) : path;
  const resolved = urlResolve(resolve, normalizedPath, params);
  // Already absolute, return as-is
  if (resolved.startsWith("http://") || resolved.startsWith("https://")) {
    return resolved;
  }
  if (!siteUrl) {
    return resolved;
  }
  const trimmedSiteUrl = siteUrl.replace(/\/+$/, "");
  return trimmedSiteUrl + (resolved.startsWith("/") ? resolved : "/" + resolved);
}
