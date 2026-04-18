/**
 * Central helper for referencing Kracking brand assets served from
 * the shared CDN at `cdn.krack.ing/kracking-assets/*`.
 *
 * All four Kracking surfaces (Marketing, Docs, Console, Kener) point
 * at the same replicated bucket so a brand refresh is a single upload
 * rather than four repo commits.
 */

const CDN_BASE_URL = "https://cdn.krack.ing/kracking-assets";

export function cdnAsset(filename: string): string {
	return `${CDN_BASE_URL}/${filename.replace(/^\//, "")}`;
}

export const CDN_ASSETS = {
	amplitude: cdnAsset("amplitude.png"),
	buyMeACoffee: cdnAsset("buymeacoffee.svg"),
	clarity: cdnAsset("clarity.png"),
	earth: cdnAsset("earth.png"),
	favicon: cdnAsset("favicon.png"),
	ga: cdnAsset("ga.png"),
	kenerSvg: cdnAsset("kener.svg"),
	logo: cdnAsset("logo.png"),
	logo96: cdnAsset("logo96.png"),
	mx: cdnAsset("mx.png"),
	ogImage: cdnAsset("og-image.png"),
	ogJpg: cdnAsset("og.jpg"),
	plausible: cdnAsset("plausible.png"),
	posthog: cdnAsset("posthog.png"),
	umami: cdnAsset("umami.png"),
} as const;
