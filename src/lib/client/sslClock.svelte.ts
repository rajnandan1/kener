/** Shared clock so SSL SECURED/remaining labels re-evaluate as time passes. */
const TICK_MS = 30_000;

let nowMs = $state(Date.now());
let started = false;

function ensureTicking(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  setInterval(() => {
    nowMs = Date.now();
  }, TICK_MS);
}

/** Reactive "now" for SSL security / remaining derived values. */
export function getSslNowMs(): number {
  ensureTicking();
  return nowMs;
}
