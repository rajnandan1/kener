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

/** Reactive "now" that ticks every 30 s in the browser, so SSL labels flip when a certificate expires. */
export function getSslNowMs(): number {
  if (typeof window === "undefined") return Date.now();
  ensureTicking();
  return nowMs;
}
