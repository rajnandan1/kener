/** Shared clock so SSL SECURED/remaining labels re-evaluate as time passes. */
const TICK_MS = 30_000;

let nowMs = $state(Date.now());
let started = false;

/** Start a single browser interval that advances the shared SSL clock. */
function ensureTicking(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  setInterval(() => {
    nowMs = Date.now();
  }, TICK_MS);
}

/**
 * Reactive "now" for SSL security / remaining derived values.
 * On the server there is no interval — always return a fresh Date.now() so SSR
 * does not reuse the module-load timestamp after a certificate has expired.
 */
export function getSslNowMs(): number {
  if (typeof window === "undefined") {
    return Date.now();
  }
  ensureTicking();
  return nowMs;
}
