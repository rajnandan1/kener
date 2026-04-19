export { default as Badge } from "./badge.svelte";
export { badgeVariants, type BadgeVariant } from "./badge.svelte";
/*
 * `KrackingBadge` is the Console-parity variant (six tone palette,
 * `rounded-md` chip). Re-exported here so public-surface components
 * can `import { KrackingBadge, type BadgeTone } from
 * "$lib/components/ui/badge"` without reaching into internals.
 */
export { default as KrackingBadge, type BadgeTone } from "./badge-kracking.svelte";
